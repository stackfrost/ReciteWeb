// ─────────────────────────────────────────────────────────────────────────────
// ReciteAI — Atomic Filesystem Commands
// src-tauri/src/commands/fs.rs
//
// Guarantees:
//   • Zero unwrap() calls — all errors are mapped to descriptive String results.
//   • Atomic write via .tmp → rename swap. If the process is killed mid-write,
//     the original file is never corrupted.
//   • A .bak copy is created before any write begins. On failure, the engine
//     automatically restores from backup.
// ─────────────────────────────────────────────────────────────────────────────

use std::path::{Path, PathBuf};
use std::fs;

/// Derives the `.bak` and `.tmp` sidecar paths from the target file path.
fn sidecar_paths(file_path: &Path) -> (PathBuf, PathBuf) {
    let mut bak = file_path.to_path_buf();
    bak.set_extension(
        file_path
            .extension()
            .map(|e| format!("{}.bak", e.to_string_lossy()))
            .unwrap_or_else(|| "bak".to_string()),
    );

    let mut tmp = file_path.to_path_buf();
    tmp.set_extension(
        file_path
            .extension()
            .map(|e| format!("{}.tmp", e.to_string_lossy()))
            .unwrap_or_else(|| "tmp".to_string()),
    );

    (bak, tmp)
}

/// Tauri command: atomically applies a validated manuscript write to disk.
///
/// Phase execution order:
///   1. Copy `file_path` → `file_path.bak`  (backup before any mutation)
///   2. Write `new_content` → `file_path.tmp`  (staged write)
///   3. Rename `file_path.tmp` → `file_path`  (atomic OS-level swap)
///
/// On ANY failure in step 2 or 3, the engine attempts to restore from the .bak
/// copy and returns a descriptive `Err(String)`.
///
/// # Arguments
/// * `file_path`   — Absolute path to the target `.tex` manuscript.
/// * `new_content` — The fully validated post-mutation manuscript string.
///   (The TypeScript side MUST call `DiffGenerator.validatePatch()` before
///    invoking this command.)
#[tauri::command]
pub async fn apply_manuscript_patch(
    file_path: String,
    new_content: Vec<u8>,
) -> Result<(), String> {
    let target = Path::new(&file_path);

    // ── Guard: target file must exist ─────────────────────────────────────────
    if !target.exists() {
        return Err(format!(
            "[ReciteAI:fs] Target file does not exist: {}",
            file_path
        ));
    }

    let (bak_path, tmp_path) = sidecar_paths(target);

    // ── Step 1: Backup ────────────────────────────────────────────────────────
    fs::copy(target, &bak_path).map_err(|e| {
        format!(
            "[ReciteAI:fs] Failed to create backup at '{}': {}",
            bak_path.display(),
            e
        )
    })?;

    // ── Step 2: Staged write to .tmp ──────────────────────────────────────────
    let write_result = fs::write(&tmp_path, &new_content).map_err(|e| {
        format!(
            "[ReciteAI:fs] Failed to write staged file at '{}': {}",
            tmp_path.display(),
            e
        )
    });

    if let Err(write_err) = write_result {
        // Clean up tmp if it was partially created
        let _ = fs::remove_file(&tmp_path);
        // Original file was never mutated, so we can discard the backup
        let _ = fs::remove_file(&bak_path);
        return Err(write_err);
    }

    // ── Step 3: Atomic rename swap ────────────────────────────────────────────
    let rename_result = fs::rename(&tmp_path, target).map_err(|e| {
        format!(
            "[ReciteAI:fs] Atomic rename failed ('{}' -> '{}'): {}",
            tmp_path.display(),
            target.display(),
            e
        )
    });

    if let Err(rename_err) = rename_result {
        // Rename failed — attempt restore from backup
        let restore_result = fs::copy(&bak_path, target).map_err(|re| {
            format!(
                "[ReciteAI:fs] CRITICAL: Restore from backup also failed: {}. Manual recovery required from '{}'.",
                re,
                bak_path.display()
            )
        });

        // Clean up orphaned tmp
        let _ = fs::remove_file(&tmp_path);

        return match restore_result {
            Ok(_) => Err(format!(
                "{} | [ReciteAI:fs] Original file successfully restored from backup.",
                rename_err
            )),
            Err(critical_err) => Err(critical_err),
        };
    }

    // ── Step 4: Cleanup ───────────────────────────────────────────────────────
    // Successful atomic swap. Discard the backup copy.
    let _ = fs::remove_file(&bak_path);

    Ok(())
}

/// Logs an LLM-generated patch as an immutable `.patch` file for the audit trail.
///
/// The `.patch` file is saved inside a hidden `.recite/patches/` directory
/// adjacent to the target manuscript.
///
/// # Arguments
/// * `file_path`     — Absolute path to the original `.tex` manuscript.
/// * `patch_payload` — Raw binary array of the unified diff.
#[tauri::command]
pub async fn log_manuscript_patch(
    file_path: String,
    patch_payload: Vec<u8>,
) -> Result<(), String> {
    use std::time::{SystemTime, UNIX_EPOCH};

    let target = Path::new(&file_path);
    let parent_dir = target.parent().unwrap_or(Path::new(""));
    let patch_dir = parent_dir.join(".recite").join("patches");

    fs::create_dir_all(&patch_dir).map_err(|e| {
        format!(
            "[ReciteAI:fs] Failed to create patch directory at '{}': {}",
            patch_dir.display(),
            e
        )
    })?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("[ReciteAI:fs] Time went backwards: {}", e))?
        .as_millis();

    let filename = target
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("unknown.tex");

    let patch_path = patch_dir.join(format!("{}-{}.patch", timestamp, filename));

    fs::write(&patch_path, &patch_payload).map_err(|e| {
        format!(
            "[ReciteAI:fs] Failed to write patch log to '{}': {}",
            patch_path.display(),
            e
        )
    })?;

    Ok(())
}
