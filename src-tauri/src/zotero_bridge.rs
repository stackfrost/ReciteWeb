// ─────────────────────────────────────────────────────────────────────────────
// ReciteAI — Zotero SQLite Bridge
// src-tauri/src/zotero_bridge.rs
//
// Queries the user's local Zotero SQLite database to locate the absolute
// filesystem path of a PDF attachment, given a Zotero citation key.
//
// Zotero v6/v7 schema notes:
//   - `items`              : Master table. Each row is any Zotero item.
//   - `itemAttachments`    : Child rows for attachments. `parentItemID` → parent.
//   - `itemData`           : EAV table keyed by `fieldID`. Field 1 = 'title'.
//   - `fields`             : Lookup for fieldID→name.
//   - `itemDataValues`     : The actual string value for each EAV row.
//   - `libraries`          : Storage root per library.
//
// Citation key resolution uses the `extra` field (itemTypeID JOIN) stored as
// a free-text blob. Zotero Better BibTeX stores the key in `extra` with the
// prefix "Citation Key: <key>". We handle both BBT and native Zotero key
// formats via a single LIKE match.
// ─────────────────────────────────────────────────────────────────────────────

use rusqlite::{Connection, Result as SqlResult, params};
use std::path::{Path, PathBuf};

/// Constructs the canonical path to the Zotero SQLite database file.
/// Follows Zotero's documented default installation paths per OS.
fn resolve_zotero_db_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(appdata).join("Zotero").join("Zotero").join("zotero.sqlite")
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join("Library").join("Application Support").join("Zotero").join("zotero.sqlite")
    }
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".zotero").join("zotero").join("zotero.sqlite")
    }
}

/// Constructs the canonical path to the Zotero storage directory.
/// PDF files in Zotero local storage live under `storage/<itemKey>/<filename>`.
fn resolve_zotero_storage_path() -> PathBuf {
    #[cfg(target_os = "windows")]
    {
        let appdata = std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(appdata).join("Zotero").join("Zotero").join("storage")
    }
    #[cfg(target_os = "macos")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join("Library").join("Application Support").join("Zotero").join("storage")
    }
    #[cfg(target_os = "linux")]
    {
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".zotero").join("zotero").join("storage")
    }
}

/// Queries the Zotero SQLite database to resolve a citation key to an
/// absolute path of the associated PDF attachment.
///
/// # Algorithm
/// 1. Opens the Zotero database in read-only mode to prevent any accidental writes.
/// 2. Locates the parent bibliographic item by matching the citation key
///    against the `extra` field (where BBT stores `Citation Key: <key>`) or
///    by matching the Zotero built-in `citationKey` column (v7).
/// 3. Joins to `itemAttachments` WHERE the `contentType` is `application/pdf`.
/// 4. Resolves the `path` column to an absolute filesystem path.
///    - If `path` starts with `storage:`, it's relative to Zotero's storage dir.
///    - If `path` starts with `/` or a drive letter, it's a linked attachment.
pub fn find_pdf_path(citation_key: &str) -> Result<String, String> {
    let db_path = resolve_zotero_db_path();

    if !db_path.exists() {
        return Err(format!(
            "Zotero database not found at '{}'. Ensure Zotero is installed.",
            db_path.display()
        ));
    }

    // Open in read-only mode — we must NEVER write to the user's Zotero database.
    let conn = Connection::open_with_flags(
        &db_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_URI,
    )
    .map_err(|e| format!("Failed to open Zotero database: {e}"))?;

    // Hardening: Configure non-blocking read-only SQLite PRAGMAs to prevent locking conflicts when Zotero is open.
    let _ = conn.pragma_update(None, "busy_timeout", 3000);
    let _ = conn.pragma_update(None, "query_only", "ON");
    let _ = conn.pragma_update(None, "read_uncommitted", "ON");

    // Query: locate the PDF attachment path for a given citation key.
    //
    // The join chain:
    //   items (parent bib item)
    //     → itemData + fields + itemDataValues (find the 'extra' field containing the BBT citation key)
    //     → itemAttachments (child attachments of that parent, filtered to PDF MIME type)
    //     → items (get the attachment item's Zotero key for storage path resolution)
    //
    // We also handle the Zotero 7 native `citationKey` column directly on `items`.
    let query = r#"
        SELECT
            ia.path,
            att_item.key AS attachment_key
        FROM items AS parent_item
        -- Zotero 7 native citation key column
        LEFT JOIN itemData AS id_ck
            ON id_ck.itemID = parent_item.itemID
        LEFT JOIN fields AS f_ck
            ON f_ck.fieldID = id_ck.fieldID AND f_ck.fieldName = 'citationKey'
        LEFT JOIN itemDataValues AS idv_ck
            ON idv_ck.valueID = id_ck.valueID
        -- BBT 'extra' field: "Citation Key: <key>"
        LEFT JOIN itemData AS id_extra
            ON id_extra.itemID = parent_item.itemID
        LEFT JOIN fields AS f_extra
            ON f_extra.fieldID = id_extra.fieldID AND f_extra.fieldName = 'extra'
        LEFT JOIN itemDataValues AS idv_extra
            ON idv_extra.valueID = id_extra.valueID
        -- Child PDF attachments
        INNER JOIN itemAttachments AS ia
            ON ia.parentItemID = parent_item.itemID
            AND ia.contentType = 'application/pdf'
        -- Attachment item row (needed for the storage key)
        INNER JOIN items AS att_item
            ON att_item.itemID = ia.itemID
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
            let resolved = resolve_attachment_path(&raw_path, &attachment_key);
            if resolved.exists() {
                Ok(resolved.to_string_lossy().into_owned())
            } else {
                Err(format!(
                    "PDF attachment path resolved to '{}' but file does not exist on disk.",
                    resolved.display()
                ))
            }
        }
        Err(rusqlite::Error::QueryReturnedNoRows) => Err(format!(
            "No PDF attachment found for citation key '{}'. Verify the key is correct and the item has a PDF attached in Zotero.",
            citation_key
        )),
        Err(e) => Err(format!("Zotero database query failed: {e}")),
    }
}

/// Resolves a raw Zotero `path` column value to an absolute `PathBuf`.
/// Handles both `storage:filename.pdf` (managed) and linked absolute paths.
fn resolve_attachment_path(raw_path: &str, attachment_key: &str) -> PathBuf {
    if let Some(filename) = raw_path.strip_prefix("storage:") {
        // Managed attachment: lives in Zotero's internal storage directory
        resolve_zotero_storage_path()
            .join(attachment_key)
            .join(filename)
    } else {
        // Linked attachment: raw_path is an absolute OS path
        // Zotero sometimes uses a `file://` URI scheme — strip it.
        let clean = raw_path
            .strip_prefix("file://")
            .unwrap_or(raw_path);
        PathBuf::from(clean)
    }
}

/// Tauri-invokable command wrapper around `find_pdf_path`.
#[tauri::command]
pub fn find_zotero_pdf(citation_key: String) -> Result<String, String> {
    find_pdf_path(&citation_key)
}
