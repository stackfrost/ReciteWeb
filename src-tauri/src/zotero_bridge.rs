// ─────────────────────────────────────────────────────────────────────────────
// ReciteAI — Zotero SQLite Bridge (v2)
// src-tauri/src/zotero_bridge.rs
//
// Read-only native bridge to the local Zotero SQLite database.
// Supports non-locking queries, Better BibTeX citekeys, collection trees,
// full item metadata, and PDF attachment resolution.
// ─────────────────────────────────────────────────────────────────────────────

use rusqlite::{Connection, OpenFlags, Result as SqlResult, params};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZoteroItem {
    pub item_id: i64,
    pub key: String,
    pub citation_key: Option<String>,
    pub item_type: String,
    pub title: String,
    pub creators: Vec<String>,
    pub publication_title: Option<String>,
    pub year: Option<String>,
    pub date: Option<String>,
    pub doi: Option<String>,
    pub abstract_note: Option<String>,
    pub collections: Vec<String>,
    pub has_pdf: bool,
    pub pdf_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ZoteroCollection {
    pub collection_id: i64,
    pub key: String,
    pub name: String,
    pub parent_collection_id: Option<i64>,
    pub item_count: usize,
}

/// Auto-detects the Zotero SQLite database path across standard multi-platform locations.
pub fn detect_zotero_db_path(custom_path: Option<&str>) -> Option<PathBuf> {
    if let Some(p) = custom_path {
        let custom = PathBuf::from(p);
        if custom.exists() {
            return Some(custom);
        }
    }

    let mut candidate_paths: Vec<PathBuf> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            candidate_paths.push(PathBuf::from(&userprofile).join("Zotero").join("zotero.sqlite"));
        }
        if let Ok(appdata) = std::env::var("APPDATA") {
            candidate_paths.push(PathBuf::from(&appdata).join("Zotero").join("Zotero").join("zotero.sqlite"));
            let profiles_dir = PathBuf::from(&appdata).join("Zotero").join("Zotero").join("Profiles");
            if let Ok(entries) = std::fs::read_dir(profiles_dir) {
                for entry in entries.flatten() {
                    let db = entry.path().join("zotero.sqlite");
                    if db.exists() {
                        candidate_paths.push(db);
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            candidate_paths.push(PathBuf::from(&home).join("Zotero").join("zotero.sqlite"));
            candidate_paths.push(PathBuf::from(&home).join("Library").join("Application Support").join("Zotero").join("zotero.sqlite"));
            let profiles_dir = PathBuf::from(&home).join("Library").join("Application Support").join("Zotero").join("Profiles");
            if let Ok(entries) = std::fs::read_dir(profiles_dir) {
                for entry in entries.flatten() {
                    let db = entry.path().join("zotero.sqlite");
                    if db.exists() {
                        candidate_paths.push(db);
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            candidate_paths.push(PathBuf::from(&home).join("Zotero").join("zotero.sqlite"));
            candidate_paths.push(PathBuf::from(&home).join(".zotero").join("zotero").join("zotero.sqlite"));
        }
    }

    for path in candidate_paths {
        if path.exists() {
            return Some(path);
        }
    }

    None
}

/// Resolves the storage root for PDF attachments based on the database directory.
fn resolve_zotero_storage_dir(db_path: &Path) -> PathBuf {
    let parent = db_path.parent().unwrap_or_else(|| Path::new("."));
    let storage = parent.join("storage");
    if storage.exists() {
        storage
    } else {
        parent.to_path_buf()
    }
}

/// Opens the SQLite database in strict read-only mode with non-blocking pragmas.
fn open_readonly_zotero_conn(db_path: &Path) -> Result<Connection, String> {
    if !db_path.exists() {
        return Err(format!("Zotero database not found at '{}'", db_path.display()));
    }

    let conn = Connection::open_with_flags(
        db_path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI,
    )
    .map_err(|e| format!("Failed to open read-only Zotero SQLite database: {e}"))?;

    let _ = conn.pragma_update(None, "busy_timeout", 3000);
    let _ = conn.pragma_update(None, "query_only", "ON");
    let _ = conn.pragma_update(None, "read_uncommitted", "ON");

    Ok(conn)
}

/// Extracts creator/author strings for a list of item IDs.
fn fetch_creators_map(conn: &Connection) -> Result<std::collections::HashMap<i64, Vec<String>>, String> {
    let mut map: std::collections::HashMap<i64, Vec<String>> = std::collections::HashMap::new();

    let query = r#"
        SELECT
            ic.itemID,
            COALESCE(cd.lastName || ', ' || cd.firstName, cd.lastName, cd.firstName, '') AS creatorName
        FROM itemCreators AS ic
        JOIN creators AS c ON c.creatorID = ic.creatorID
        JOIN creatorData AS cd ON cd.creatorDataID = c.creatorDataID
        ORDER BY ic.itemID, ic.orderIndex ASC
    "#;

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let item_id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            Ok((item_id, name))
        })
        .map_err(|e| e.to_string())?;

    for row in rows.flatten() {
        let (item_id, name) = row;
        if !name.trim().is_empty() {
            map.entry(item_id).or_default().push(name);
        }
    }

    Ok(map)
}

/// Queries Zotero items with full bibliographic metadata, Better BibTeX citekeys, and PDF paths.
pub fn query_zotero_items(
    db_path: Option<&str>,
    filter_query: Option<&str>,
    limit: usize,
) -> Result<Vec<ZoteroItem>, String> {
    let resolved_db = detect_zotero_db_path(db_path)
        .ok_or_else(|| "Zotero database not found in standard paths. Please configure a custom path in settings.".to_string())?;

    let conn = open_readonly_zotero_conn(&resolved_db)?;
    let storage_dir = resolve_zotero_storage_dir(&resolved_db);
    let creators_map = fetch_creators_map(&conn).unwrap_or_default();

    let query = r#"
        SELECT
            i.itemID,
            i.key,
            it.typeName,
            -- Title
            MAX(CASE WHEN f.fieldName = 'title' THEN idv.value END) AS title,
            -- Publication Title / Journal
            MAX(CASE WHEN f.fieldName IN ('publicationTitle', 'proceedingsTitle', 'bookTitle', 'university') THEN idv.value END) AS pubTitle,
            -- Date
            MAX(CASE WHEN f.fieldName = 'date' THEN idv.value END) AS dateVal,
            -- DOI
            MAX(CASE WHEN f.fieldName = 'doi' THEN idv.value END) AS doiVal,
            -- Abstract
            MAX(CASE WHEN f.fieldName = 'abstractNote' THEN idv.value END) AS abstractVal,
            -- Better BibTeX / Extra Citekey
            MAX(CASE WHEN f.fieldName = 'extra' THEN idv.value END) AS extraVal,
            MAX(CASE WHEN f.fieldName = 'citationKey' THEN idv.value END) AS nativeCiteKey,
            -- PDF Attachment
            ia.path AS attachmentPath,
            att_item.key AS attachmentKey
        FROM items AS i
        JOIN itemTypes AS it ON it.itemTypeID = i.itemTypeID
        LEFT JOIN itemData AS id ON id.itemID = i.itemID
        LEFT JOIN fields AS f ON f.fieldID = id.fieldID
        LEFT JOIN itemDataValues AS idv ON idv.valueID = id.valueID
        -- PDF Attachments
        LEFT JOIN itemAttachments AS ia ON ia.parentItemID = i.itemID AND ia.contentType = 'application/pdf'
        LEFT JOIN items AS att_item ON att_item.itemID = ia.itemID
        WHERE
            i.itemID NOT IN (SELECT itemID FROM deletedItems)
            AND it.typeName NOT IN ('attachment', 'note', 'annotation')
        GROUP BY i.itemID
        ORDER BY i.dateModified DESC
        LIMIT ?1
    "#;

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let filter_lower = filter_query.map(|q| q.to_lowercase());

    let rows = stmt
        .query_map(params![limit as i64], |row| {
            let item_id: i64 = row.get(0)?;
            let key: String = row.get(1)?;
            let item_type: String = row.get(2)?;
            let title: Option<String> = row.get(3)?;
            let pub_title: Option<String> = row.get(4)?;
            let date_val: Option<String> = row.get(5)?;
            let doi_val: Option<String> = row.get(6)?;
            let abstract_val: Option<String> = row.get(7)?;
            let extra_val: Option<String> = row.get(8)?;
            let native_citekey: Option<String> = row.get(9)?;
            let raw_att_path: Option<String> = row.get(10)?;
            let att_key: Option<String> = row.get(11)?;

            Ok((
                item_id,
                key,
                item_type,
                title.unwrap_or_default(),
                pub_title,
                date_val,
                doi_val,
                abstract_val,
                extra_val,
                native_citekey,
                raw_att_path,
                att_key,
            ))
        })
        .map_err(|e| e.to_string())?;

    let mut items = Vec::new();

    for row in rows.flatten() {
        let (
            item_id,
            key,
            item_type,
            title,
            pub_title,
            date_val,
            doi_val,
            abstract_val,
            extra_val,
            native_citekey,
            raw_att_path,
            att_key,
        ) = row;

        if title.trim().is_empty() {
            continue;
        }

        // Extract Better BibTeX citation key from `extra` or native column
        let mut citation_key = native_citekey;
        if citation_key.is_none() {
            if let Some(extra) = &extra_val {
                for line in extra.lines() {
                    let trimmed = line.trim();
                    if let Some(k) = trimmed.strip_prefix("Citation Key:") {
                        citation_key = Some(k.trim().to_string());
                        break;
                    } else if let Some(k) = trimmed.strip_prefix("bibtex:") {
                        citation_key = Some(k.trim().to_string());
                        break;
                    }
                }
            }
        }

        // Extract year from date string
        let year = date_val.as_ref().and_then(|d| {
            let re_year = d.chars().filter(|c| c.is_ascii_digit()).collect::<String>();
            if re_year.len() >= 4 {
                Some(re_year[..4].to_string())
            } else {
                None
            }
        });

        // Resolve absolute PDF attachment path
        let mut has_pdf = false;
        let mut pdf_path = None;

        if let (Some(raw_p), Some(a_key)) = (raw_att_path, att_key) {
            let resolved = if let Some(filename) = raw_p.strip_prefix("storage:") {
                storage_dir.join(&a_key).join(filename)
            } else {
                let clean = raw_p.strip_prefix("file://").unwrap_or(&raw_p);
                PathBuf::from(clean)
            };

            if resolved.exists() {
                has_pdf = true;
                pdf_path = Some(resolved.to_string_lossy().into_owned());
            }
        }

        let creators = creators_map.get(&item_id).cloned().unwrap_or_default();

        // Perform keyword filtering if filter_query is provided
        if let Some(ref q) = filter_lower {
            let matches_title = title.to_lowercase().contains(q);
            let matches_creator = creators.iter().any(|c| c.to_lowercase().contains(q));
            let matches_key = citation_key.as_ref().map(|k| k.to_lowercase().contains(q)).unwrap_or(false);
            let matches_doi = doi_val.as_ref().map(|d| d.to_lowercase().contains(q)).unwrap_or(false);

            if !matches_title && !matches_creator && !matches_key && !matches_doi {
                continue;
            }
        }

        items.push(ZoteroItem {
            item_id,
            key,
            citation_key,
            item_type,
            title,
            creators,
            publication_title: pub_title,
            year,
            date: date_val,
            doi: doi_val,
            abstract_note: abstract_val,
            collections: Vec::new(),
            has_pdf,
            pdf_path,
        });
    }

    Ok(items)
}

/// Retrieves the user's Zotero collection tree.
pub fn query_zotero_collections(db_path: Option<&str>) -> Result<Vec<ZoteroCollection>, String> {
    let resolved_db = detect_zotero_db_path(db_path)
        .ok_or_else(|| "Zotero database not found in standard paths.".to_string())?;

    let conn = open_readonly_zotero_conn(&resolved_db)?;

    let query = r#"
        SELECT
            c.collectionID,
            c.key,
            c.collectionName,
            c.parentCollectionID,
            COUNT(ci.itemID) AS itemCount
        FROM collections AS c
        LEFT JOIN collectionItems AS ci ON ci.collectionID = c.collectionID
        GROUP BY c.collectionID
        ORDER BY c.collectionName ASC
    "#;

    let mut stmt = conn.prepare(query).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            let collection_id: i64 = row.get(0)?;
            let key: String = row.get(1)?;
            let name: String = row.get(2)?;
            let parent_id: Option<i64> = row.get(3)?;
            let count: i64 = row.get(4)?;

            Ok(ZoteroCollection {
                collection_id,
                key,
                name,
                parent_collection_id: parent_id,
                item_count: count as usize,
            })
        })
        .map_err(|e| e.to_string())?;

    let mut collections = Vec::new();
    for row in rows.flatten() {
        collections.push(row);
    }

    Ok(collections)
}

/// Queries the Zotero SQLite database to resolve a citation key to an
/// absolute path of the associated PDF attachment.
pub fn find_pdf_path(citation_key: &str) -> Result<String, String> {
    let resolved_db = detect_zotero_db_path(None)
        .ok_or_else(|| "Zotero database not found.".to_string())?;

    let conn = open_readonly_zotero_conn(&resolved_db)?;
    let storage_dir = resolve_zotero_storage_dir(&resolved_db);

    let query = r#"
        SELECT
            ia.path,
            att_item.key AS attachment_key
        FROM items AS parent_item
        LEFT JOIN itemData AS id_ck ON id_ck.itemID = parent_item.itemID
        LEFT JOIN fields AS f_ck ON f_ck.fieldID = id_ck.fieldID AND f_ck.fieldName = 'citationKey'
        LEFT JOIN itemDataValues AS idv_ck ON idv_ck.valueID = id_ck.valueID
        LEFT JOIN itemData AS id_extra ON id_extra.itemID = parent_item.itemID
        LEFT JOIN fields AS f_extra ON f_extra.fieldID = id_extra.fieldID AND f_extra.fieldName = 'extra'
        LEFT JOIN itemDataValues AS idv_extra ON idv_extra.valueID = id_extra.valueID
        INNER JOIN itemAttachments AS ia ON ia.parentItemID = parent_item.itemID AND ia.contentType = 'application/pdf'
        INNER JOIN items AS att_item ON att_item.itemID = ia.itemID
        WHERE
            parent_item.itemID NOT IN (SELECT itemID FROM deletedItems)
            AND (
                idv_ck.value = ?1
                OR idv_extra.value LIKE '%Citation Key: ' || ?1 || '%'
            )
        LIMIT 1
    "#;

    let result: SqlResult<(String, String)> = conn.query_row(
        query,
        params![citation_key],
        |row| Ok((row.get(0)?, row.get(1)?)),
    );

    match result {
        Ok((raw_path, attachment_key)) => {
            let resolved = if let Some(filename) = raw_path.strip_prefix("storage:") {
                storage_dir.join(&attachment_key).join(filename)
            } else {
                let clean = raw_path.strip_prefix("file://").unwrap_or(&raw_path);
                PathBuf::from(clean)
            };

            if resolved.exists() {
                Ok(resolved.to_string_lossy().into_owned())
            } else {
                Err(format!("PDF attachment resolved to '{}' but file does not exist on disk.", resolved.display()))
            }
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(format!(
            "No PDF attachment found for citation key '{}'.",
            citation_key
        )),
        Err(e) => Err(format!("Zotero database query failed: {e}")),
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TAURI COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn detect_zotero_path(custom_path: Option<String>) -> Result<Option<String>, String> {
    Ok(detect_zotero_db_path(custom_path.as_deref()).map(|p| p.to_string_lossy().into_owned()))
}

#[tauri::command]
pub fn get_zotero_items(db_path: Option<String>) -> Result<Vec<ZoteroItem>, String> {
    query_zotero_items(db_path.as_deref(), None, 300)
}

#[tauri::command]
pub fn search_zotero_library(query: String, db_path: Option<String>) -> Result<Vec<ZoteroItem>, String> {
    query_zotero_items(db_path.as_deref(), Some(&query), 50)
}

#[tauri::command]
pub fn get_zotero_collections(db_path: Option<String>) -> Result<Vec<ZoteroCollection>, String> {
    query_zotero_collections(db_path.as_deref())
}

#[tauri::command]
pub fn find_zotero_pdf(citation_key: String) -> Result<String, String> {
    find_pdf_path(&citation_key)
}
