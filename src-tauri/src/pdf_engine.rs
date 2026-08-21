// ─────────────────────────────────────────────────────────────────────────────
// ReciteAI — High-Speed Local PDF Extraction Engine
// src-tauri/src/pdf_engine.rs
//
// Extracts raw text from a local PDF file entirely in-process via Rust.
// No cloud upload. No JavaScript overhead. Data never leaves the machine.
//
// Crate: `pdf-extract` wraps `lopdf` for robust text extraction across
// multi-page PDFs, handling both CID/Type0 and standard latin fonts.
// ─────────────────────────────────────────────────────────────────────────────

use std::path::Path;

/// Extracts all text content from a PDF at the given absolute path.
///
/// # Error Handling
/// - Missing file: returns a descriptive error immediately without panicking.
/// - Encrypted/corrupted PDF: `pdf_extract` returns an Err which we surface.
/// - Empty document: returns an empty `String` (not an error).
pub fn extract_text_from_pdf(path: &str) -> Result<String, String> {
    let pdf_path = Path::new(path);

    if !pdf_path.exists() {
        return Err(format!(
            "PDF not found at path '{}'. Ensure the file exists on disk.",
            path
        ));
    }

    if !pdf_path.is_file() {
        return Err(format!("Path '{}' exists but is not a file.", path));
    }

    // Verify extension as a fast sanity check before invoking the parser
    match pdf_path.extension().and_then(|e| e.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("pdf") => {}
        _ => {
            return Err(format!(
                "Path '{}' does not appear to be a PDF file (unexpected extension).",
                path
            ));
        }
    }

    pdf_extract::extract_text(pdf_path)
        .map_err(|e| format!("PDF extraction failed for '{}': {e}", path))
}

/// Tauri-invokable command for extracting text from a local PDF file.
///
/// Called from the Next.js frontend via `invoke('extract_pdf_text', { path })`.
#[tauri::command]
pub fn extract_pdf_text(path: String) -> Result<String, String> {
    extract_text_from_pdf(&path)
}
