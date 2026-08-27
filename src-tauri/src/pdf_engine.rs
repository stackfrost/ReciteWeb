// ─────────────────────────────────────────────────────────────────────────────
// ReciteAI — Spatial 2-Column PDF Extraction Engine
// src-tauri/src/pdf_engine.rs
//
// Pipeline overview:
//
//   ┌─────────────────────────────────────────────────────────────────────┐
//   │ 1. Content Stream Interpreter (lopdf)                               │
//   │    Parse BT/ET, Tm/Td/TD/T*, Tj/TJ operations.                     │
//   │    Track text transformation matrix → emit TextSpan(x,y,w,h,text). │
//   └────────────────────────────┬────────────────────────────────────────┘
//                                │
//   ┌────────────────────────────▼────────────────────────────────────────┐
//   │ 2. Line Assembly                                                     │
//   │    Group spans sharing a baseline (|Δy| < 2.5 pt) into TextLines.  │
//   └────────────────────────────┬────────────────────────────────────────┘
//                                │
//   ┌────────────────────────────▼────────────────────────────────────────┐
//   │ 3. Vertical Page Partitioning                                        │
//   │    Identify full-width Header/Footer bands                           │
//   │    (line.width ≥ 0.60 × page_width, from the top / bottom edges).  │
//   └────────────────────────────┬────────────────────────────────────────┘
//                                │
//   ┌────────────────────────────▼────────────────────────────────────────┐
//   │ 4. Gutter Detection (Body Zone)                                      │
//   │    Split body lines at page midpoint.                                │
//   │    col1_max = p95(left.max_x), col2_min = p5(right.min_x).          │
//   │    If gutter_width ≥ 10 pt → TwoColumn, else → SingleColumn.        │
//   └────────────────────────────┬────────────────────────────────────────┘
//                                │
//   ┌────────────────────────────▼────────────────────────────────────────┐
//   │ 5. Reading-Order Topological Sort                                    │
//   │    Header (y↑) → Left col (y↑) → Right col (y↑) → Footer (y↑)     │
//   └─────────────────────────────────────────────────────────────────────┘
//
// The public API (`extract_pdf_text` Tauri command) is unchanged:
//   invoke('extract_pdf_text', { path }) → Result<String, String>
// ─────────────────────────────────────────────────────────────────────────────

use std::collections::BTreeMap;
use std::path::Path;
use lopdf::{Document, Object, content::Content};

// ─────────────────────────────────────────────────────────────────────────────
// § DATA STRUCTURES
// ─────────────────────────────────────────────────────────────────────────────

/// Axis-aligned bounding box with **top-left** origin in PDF points (pt).
///
/// PDF spec uses bottom-left origin; all y-values are normalised on extraction.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Rect {
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
}

impl Rect {
    #[inline]
    pub fn right(&self) -> f32 { self.x + self.width }
    #[inline]
    pub fn bottom(&self) -> f32 { self.y + self.height }
    #[inline]
    pub fn mid_x(&self) -> f32 { self.x + self.width * 0.5 }
    #[inline]
    pub fn mid_y(&self) -> f32 { self.y + self.height * 0.5 }
}

/// An atomic decoded text segment from a single PDF text-show operator.
#[derive(Debug, Clone)]
pub struct TextSpan {
    pub text: String,
    pub bbox: Rect,
    pub font_size: f32,
}

/// A horizontally assembled line of text on a shared baseline.
#[derive(Debug, Clone)]
pub struct TextLine {
    pub text: String,
    pub bbox: Rect,
    pub font_size: f32,
}

/// Spatially classified column band for a single page.
///
/// ```
/// Page (top → bottom)
/// ┌──────────────────────────────────────────┐
/// │  Header(Vec<TextLine>)  — title/authors  │ ← full-width lines from top
/// ├──────────────────┬───────────────────────┤
/// │  Left column     │  Right column         │ ← TwoColumn { left, right }
/// │  (top → bottom)  │  (top → bottom)       │   or SingleColumn
/// ├──────────────────┴───────────────────────┤
/// │  Footer(Vec<TextLine>)  — page number    │ ← full-width lines near bottom
/// └──────────────────────────────────────────┘
/// ```
#[allow(dead_code)]
pub enum ColumnBand {
    Header(Vec<TextLine>),
    TwoColumn { left: Vec<TextLine>, right: Vec<TextLine> },
    SingleColumn(Vec<TextLine>),
    Footer(Vec<TextLine>),
}

// ─────────────────────────────────────────────────────────────────────────────
// § TEXT MATRIX TRACKER
// ─────────────────────────────────────────────────────────────────────────────

/// Tracks the PDF text transformation matrix during content stream parsing.
///
/// The text matrix is a 3×3 homogeneous matrix:
///   ┌ a  b  0 ┐
///   │ c  d  0 │
///   └ e  f  1 ┘
#[derive(Debug, Clone, Copy)]
struct TextMatrix {
    a: f32, b: f32,
    c: f32, d: f32,
    e: f32, f: f32,
}

impl TextMatrix {
    fn identity() -> Self {
        TextMatrix { a: 1.0, b: 0.0, c: 0.0, d: 1.0, e: 0.0, f: 0.0 }
    }

    /// Apply a `Td` or `TD` offset: [1 0 0 1 tx ty] × current.
    fn translate(&self, tx: f32, ty: f32) -> Self {
        TextMatrix {
            a: self.a,
            b: self.b,
            c: self.c,
            d: self.d,
            e: self.a * tx + self.c * ty + self.e,
            f: self.b * tx + self.d * ty + self.f,
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// § CONTENT STREAM INTERPRETER
// ─────────────────────────────────────────────────────────────────────────────

/// Decode a PDF Object to an f32 number (Integer or Real).
fn obj_to_f32(obj: &Object) -> Option<f32> {
    match obj {
        Object::Real(v)    => Some(*v),
        Object::Integer(v) => Some(*v as f32),
        _ => None,
    }
}

/// Decode a PDF Object to a plain-text String via UTF-8 or lossy Latin-1.
fn obj_to_string(obj: &Object) -> String {
    match obj {
        Object::String(bytes, _) => {
            String::from_utf8(bytes.clone())
                .unwrap_or_else(|_| bytes.iter().map(|&b| b as char).collect())
        }
        Object::Name(name) => {
            String::from_utf8_lossy(name).into_owned()
        }
        _ => String::new(),
    }
}

/// Walk a single page's content stream and emit a `Vec<TextSpan>`.
fn extract_spans_from_page(
    doc: &Document,
    page_id: (u32, u16),
    page_height: f32,
) -> Vec<TextSpan> {
    let mut spans: Vec<TextSpan> = Vec::new();

    let content_bytes = match doc.get_page_content(page_id) {
        Ok(bytes) => bytes,
        Err(_)    => return spans,
    };

    let content = match Content::decode(&content_bytes) {
        Ok(c)  => c,
        Err(_) => return spans,
    };

    let mut ctm   = TextMatrix::identity();
    let mut tm    = TextMatrix::identity();
    let mut tlm   = TextMatrix::identity();
    let mut font_size: f32 = 12.0;
    let mut leading: f32   = 0.0;
    let mut in_text_block  = false;

    let mut ctm_stack: Vec<TextMatrix> = Vec::new();

    for op in &content.operations {
        match op.operator.as_str() {
            "q" => ctm_stack.push(ctm),
            "Q" => {
                if let Some(saved) = ctm_stack.pop() {
                    ctm = saved;
                }
            }
            "cm" if op.operands.len() == 6 => {
                let vals: Vec<f32> = op.operands.iter()
                    .filter_map(obj_to_f32)
                    .collect();
                if vals.len() == 6 {
                    ctm = TextMatrix {
                        a: vals[0] * ctm.a + vals[1] * ctm.c,
                        b: vals[0] * ctm.b + vals[1] * ctm.d,
                        c: vals[2] * ctm.a + vals[3] * ctm.c,
                        d: vals[2] * ctm.b + vals[3] * ctm.d,
                        e: vals[4] * ctm.a + vals[5] * ctm.c + ctm.e,
                        f: vals[4] * ctm.b + vals[5] * ctm.d + ctm.f,
                    };
                }
            }
            "BT" => {
                in_text_block = true;
                tm  = TextMatrix::identity();
                tlm = TextMatrix::identity();
            }
            "ET" => {
                in_text_block = false;
            }
            "Tf" if op.operands.len() >= 2 => {
                if let Some(sz) = obj_to_f32(&op.operands[1]) {
                    font_size = sz.abs().max(1.0);
                }
            }
            "TL" if op.operands.len() >= 1 => {
                if let Some(l) = obj_to_f32(&op.operands[0]) {
                    leading = l;
                }
            }
            "Tm" if in_text_block && op.operands.len() == 6 => {
                let vals: Vec<f32> = op.operands.iter()
                    .filter_map(obj_to_f32)
                    .collect();
                if vals.len() == 6 {
                    tm = TextMatrix {
                        a: vals[0], b: vals[1],
                        c: vals[2], d: vals[3],
                        e: vals[4], f: vals[5],
                    };
                    tlm = tm;
                }
            }
            "Td" if in_text_block && op.operands.len() >= 2 => {
                let tx = obj_to_f32(&op.operands[0]).unwrap_or(0.0);
                let ty = obj_to_f32(&op.operands[1]).unwrap_or(0.0);
                tlm = tlm.translate(tx, ty);
                tm  = tlm;
            }
            "TD" if in_text_block && op.operands.len() >= 2 => {
                let tx = obj_to_f32(&op.operands[0]).unwrap_or(0.0);
                let ty = obj_to_f32(&op.operands[1]).unwrap_or(0.0);
                leading = -ty;
                tlm = tlm.translate(tx, ty);
                tm  = tlm;
            }
            "T*" if in_text_block => {
                tlm = tlm.translate(0.0, -leading);
                tm  = tlm;
            }
            "Tj" if in_text_block && !op.operands.is_empty() => {
                let text = obj_to_string(&op.operands[0]);
                if !text.trim().is_empty() {
                    let span = make_span(&text, &tm, &ctm, font_size, page_height);
                    spans.push(span);
                    let width_pt = estimate_width(&text, font_size);
                    tm.e += width_pt;
                }
            }
            "TJ" if in_text_block && !op.operands.is_empty() => {
                if let Object::Array(arr) = &op.operands[0] {
                    let mut segment = String::new();
                    let mut cursor_x = tm.e;
                    let mut seg_start_tm = tm;

                    for item in arr {
                        match item {
                            Object::String(_, _) | Object::Name(_) => {
                                let text = obj_to_string(item);
                                segment.push_str(&text);
                            }
                            Object::Integer(k) => {
                                if !segment.trim().is_empty() {
                                    let seg_tm = TextMatrix { e: cursor_x, ..seg_start_tm };
                                    let span = make_span(&segment, &seg_tm, &ctm, font_size, page_height);
                                    cursor_x += estimate_width(&segment, font_size);
                                    spans.push(span);
                                    segment.clear();
                                    seg_start_tm = TextMatrix { e: cursor_x, ..tm };
                                } else if !segment.is_empty() {
                                    cursor_x += estimate_width(&segment, font_size);
                                    segment.clear();
                                    seg_start_tm = TextMatrix { e: cursor_x, ..tm };
                                }
                                cursor_x -= (*k as f32) * font_size / 1000.0;
                            }
                            Object::Real(k) => {
                                if !segment.trim().is_empty() {
                                    let seg_tm = TextMatrix { e: cursor_x, ..seg_start_tm };
                                    let span = make_span(&segment, &seg_tm, &ctm, font_size, page_height);
                                    cursor_x += estimate_width(&segment, font_size);
                                    spans.push(span);
                                    segment.clear();
                                    seg_start_tm = TextMatrix { e: cursor_x, ..tm };
                                } else if !segment.is_empty() {
                                    cursor_x += estimate_width(&segment, font_size);
                                    segment.clear();
                                    seg_start_tm = TextMatrix { e: cursor_x, ..tm };
                                }
                                cursor_x -= (*k) * font_size / 1000.0;
                            }
                            _ => {}
                        }
                    }

                    if !segment.trim().is_empty() {
                        let seg_tm = TextMatrix { e: cursor_x, ..seg_start_tm };
                        let span = make_span(&segment, &seg_tm, &ctm, font_size, page_height);
                        cursor_x += estimate_width(&segment, font_size);
                        spans.push(span);
                    }
                    tm.e = cursor_x;
                }
            }
            "'" if in_text_block && !op.operands.is_empty() => {
                tlm = tlm.translate(0.0, -leading);
                tm  = tlm;
                let text = obj_to_string(&op.operands[0]);
                if !text.trim().is_empty() {
                    let span = make_span(&text, &tm, &ctm, font_size, page_height);
                    tm.e += estimate_width(&text, font_size);
                    spans.push(span);
                }
            }
            _ => {}
        }
    }

    spans
}

/// Build a `TextSpan` from the current text matrix and CTM.
fn make_span(
    text: &str,
    tm: &TextMatrix,
    ctm: &TextMatrix,
    font_size: f32,
    page_height: f32,
) -> TextSpan {
    let scale = (tm.a * tm.a + tm.b * tm.b).sqrt().max(0.1);
    let eff_font = font_size * scale;

    let x_pdf = tm.e + ctm.e;
    let y_pdf = tm.f + ctm.f;

    let width  = estimate_width(text, eff_font);
    let height = eff_font;
    let y_top = page_height - y_pdf - height;

    TextSpan {
        text: text.to_owned(),
        bbox: Rect { x: x_pdf, y: y_top, width, height },
        font_size: eff_font,
    }
}

/// Estimate text width in points using a proportional model (0.5 em per char).
#[inline]
fn estimate_width(text: &str, font_size: f32) -> f32 {
    let char_count = text.chars().count() as f32;
    char_count * font_size * 0.5
}

// ─────────────────────────────────────────────────────────────────────────────
// § LINE ASSEMBLY
// ─────────────────────────────────────────────────────────────────────────────

const BASELINE_TOLERANCE_PT: f32 = 2.5;

/// Group `TextSpan`s into `TextLine`s by shared vertical baseline.
fn assemble_lines(mut spans: Vec<TextSpan>) -> Vec<TextLine> {
    if spans.is_empty() { return vec![]; }

    spans.sort_by(|a, b| {
        a.bbox.mid_y().partial_cmp(&b.bbox.mid_y())
            .unwrap_or(std::cmp::Ordering::Equal)
            .then(a.bbox.x.partial_cmp(&b.bbox.x).unwrap_or(std::cmp::Ordering::Equal))
    });

    let mut lines: Vec<TextLine> = Vec::new();
    let mut group: Vec<TextSpan> = Vec::new();
    let mut group_y: f32 = spans[0].bbox.mid_y();

    for span in spans {
        if (span.bbox.mid_y() - group_y).abs() <= BASELINE_TOLERANCE_PT {
            group.push(span);
        } else {
            if !group.is_empty() {
                lines.push(merge_spans_into_line(group));
            }
            group_y = span.bbox.mid_y();
            group = vec![span];
        }
    }
    if !group.is_empty() {
        lines.push(merge_spans_into_line(group));
    }

    lines
}

fn merge_spans_into_line(mut spans: Vec<TextSpan>) -> TextLine {
    spans.sort_by(|a, b| a.bbox.x.partial_cmp(&b.bbox.x).unwrap_or(std::cmp::Ordering::Equal));

    let min_x   = spans.iter().map(|s| s.bbox.x).fold(f32::MAX, f32::min);
    let max_x   = spans.iter().map(|s| s.bbox.right()).fold(f32::MIN, f32::max);
    let min_y   = spans.iter().map(|s| s.bbox.y).fold(f32::MAX, f32::min);
    let max_y   = spans.iter().map(|s| s.bbox.bottom()).fold(f32::MIN, f32::max);
    let avg_fs  = spans.iter().map(|s| s.font_size).sum::<f32>() / spans.len() as f32;

    let mut text_parts: Vec<String> = Vec::new();
    for span in &spans {
        let t = span.text.trim().to_owned();
        if !t.is_empty() { text_parts.push(t); }
    }
    let text = text_parts.join(" ");

    TextLine {
        text,
        bbox: Rect {
            x: min_x,
            y: min_y,
            width: (max_x - min_x).max(1.0),
            height: (max_y - min_y).max(1.0),
        },
        font_size: avg_fs,
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// § FULL-WIDTH BAND DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const FULL_WIDTH_RATIO: f32 = 0.60;

fn is_full_width(line: &TextLine, page_width: f32) -> bool {
    let relative_width = line.bbox.width / page_width;
    let center_span    = line.bbox.x < page_width * 0.30
                      && line.bbox.right() > page_width * 0.70;
    relative_width >= FULL_WIDTH_RATIO || center_span
}

fn header_cutoff(lines: &[TextLine], page_width: f32) -> usize {
    let mut i = 0;
    while i < lines.len() && is_full_width(&lines[i], page_width) {
        i += 1;
    }
    i
}

fn footer_cutoff(lines: &[TextLine], page_width: f32) -> usize {
    let mut j = lines.len();
    while j > 0 && is_full_width(&lines[j - 1], page_width) {
        j -= 1;
    }
    j
}

// ─────────────────────────────────────────────────────────────────────────────
// § GUTTER DETECTION & COLUMN ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────

const MIN_GUTTER_WIDTH_PT: f32 = 10.0;

fn percentile(sorted: &[f32], n: f32) -> f32 {
    if sorted.is_empty() { return 0.0; }
    if sorted.len() == 1 { return sorted[0]; }
    let idx = ((n / 100.0) * (sorted.len() - 1) as f32).min((sorted.len() - 1) as f32);
    let lo  = idx.floor() as usize;
    let hi  = idx.ceil()  as usize;
    let frac = idx - lo as f32;
    sorted[lo] * (1.0 - frac) + sorted[hi] * frac
}

fn segment_body(body_lines: Vec<TextLine>, page_width: f32) -> ColumnBand {
    if body_lines.is_empty() {
        return ColumnBand::SingleColumn(body_lines);
    }

    let page_mid = page_width / 2.0;

    let left_lines: Vec<&TextLine> = body_lines.iter()
        .filter(|l| l.bbox.mid_x() < page_mid)
        .collect();
    let right_lines: Vec<&TextLine> = body_lines.iter()
        .filter(|l| l.bbox.mid_x() >= page_mid)
        .collect();

    if left_lines.len() < 3 || right_lines.len() < 3 {
        let mut single = body_lines;
        single.sort_by(|a, b| a.bbox.y.partial_cmp(&b.bbox.y).unwrap_or(std::cmp::Ordering::Equal));
        return ColumnBand::SingleColumn(single);
    }

    let mut col1_rights: Vec<f32> = left_lines.iter().map(|l| l.bbox.right()).collect();
    col1_rights.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let col1_max = percentile(&col1_rights, 95.0);

    let mut col2_lefts: Vec<f32> = right_lines.iter().map(|l| l.bbox.x).collect();
    col2_lefts.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let col2_min = percentile(&col2_lefts, 5.0);

    let gutter_width  = col2_min - col1_max;
    let gutter_center = (col1_max + col2_min) / 2.0;

    if gutter_width >= MIN_GUTTER_WIDTH_PT && col1_max < page_width * 0.55 {
        let mut left: Vec<TextLine>  = Vec::new();
        let mut right: Vec<TextLine> = Vec::new();

        for line in body_lines {
            if line.bbox.mid_x() < gutter_center {
                left.push(line);
            } else {
                right.push(line);
            }
        }

        left.sort_by(|a, b|  a.bbox.y.partial_cmp(&b.bbox.y).unwrap_or(std::cmp::Ordering::Equal));
        right.sort_by(|a, b| a.bbox.y.partial_cmp(&b.bbox.y).unwrap_or(std::cmp::Ordering::Equal));

        ColumnBand::TwoColumn { left, right }
    } else {
        let mut single = body_lines;
        single.sort_by(|a, b| a.bbox.y.partial_cmp(&b.bbox.y).unwrap_or(std::cmp::Ordering::Equal));
        ColumnBand::SingleColumn(single)
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// § PAGE LAYOUT → READING-ORDER TEXT
// ─────────────────────────────────────────────────────────────────────────────

fn page_to_text(lines: Vec<TextLine>, page_width: f32) -> String {
    if lines.is_empty() { return String::new(); }

    let h_cut = header_cutoff(&lines, page_width);
    let f_cut = footer_cutoff(&lines, page_width);

    let body_start = h_cut;
    let body_end   = f_cut.max(h_cut);

    let header_lines = &lines[..body_start];
    let body_lines   = lines[body_start..body_end].to_vec();
    let footer_lines = &lines[body_end..];

    let body_band = segment_body(body_lines, page_width);

    let mut out = String::new();

    // 1. Header
    for l in header_lines {
        if !l.text.trim().is_empty() {
            out.push_str(l.text.trim());
            out.push('\n');
        }
    }

    // 2. Body (left-then-right or single)
    match body_band {
        ColumnBand::TwoColumn { left, right } => {
            for l in &left  { if !l.text.trim().is_empty() { out.push_str(l.text.trim()); out.push('\n'); } }
            for l in &right { if !l.text.trim().is_empty() { out.push_str(l.text.trim()); out.push('\n'); } }
        }
        ColumnBand::SingleColumn(single) | ColumnBand::Header(single) | ColumnBand::Footer(single) => {
            for l in &single { if !l.text.trim().is_empty() { out.push_str(l.text.trim()); out.push('\n'); } }
        }
    }

    // 3. Footer
    for l in footer_lines {
        if !l.text.trim().is_empty() {
            out.push_str(l.text.trim());
            out.push('\n');
        }
    }

    out
}

// ─────────────────────────────────────────────────────────────────────────────
// § MEDIA BOX HELPERS
// ─────────────────────────────────────────────────────────────────────────────

fn get_page_dimensions(doc: &Document, page_id: (u32, u16)) -> (f32, f32) {
    const DEFAULT_W: f32 = 595.0;
    const DEFAULT_H: f32 = 842.0;

    let page_dict = match doc.get_dictionary(page_id) {
        Ok(d)  => d,
        Err(_) => return (DEFAULT_W, DEFAULT_H),
    };

    let media_box = page_dict.get(b"MediaBox")
        .ok()
        .and_then(|obj| doc.dereference(obj).ok())
        .and_then(|(_, o)| if let Object::Array(a) = o { Some(a.clone()) } else { None });

    if let Some(arr) = media_box {
        let nums: Vec<f32> = arr.iter().filter_map(obj_to_f32).collect();
        if nums.len() >= 4 {
            let (x0, y0, x1, y1) = (nums[0], nums[1], nums[2], nums[3]);
            return ((x1 - x0).abs().max(1.0), (y1 - y0).abs().max(1.0));
        }
    }

    (DEFAULT_W, DEFAULT_H)
}

// ─────────────────────────────────────────────────────────────────────────────
// § PUBLIC API — document-level extraction
// ─────────────────────────────────────────────────────────────────────────────

/// Extract spatially-correct reading-order text from a PDF document.
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
    match pdf_path.extension().and_then(|e| e.to_str()) {
        Some(ext) if ext.eq_ignore_ascii_case("pdf") => {}
        _ => return Err(format!(
            "Path '{}' does not appear to be a PDF file (unexpected extension).",
            path
        )),
    }

    let doc = Document::load(pdf_path)
        .map_err(|e| format!("Failed to load PDF '{}': {}", path, e))?;

    let pages: BTreeMap<u32, (u32, u16)> = doc
        .get_pages()
        .into_iter()
        .map(|(page_num, id)| (page_num, id))
        .collect();

    if pages.is_empty() {
        return Ok(String::new());
    }

    let mut full_text = String::new();

    for (_page_num, page_id) in &pages {
        let (page_width, page_height) = get_page_dimensions(&doc, *page_id);

        let spans = extract_spans_from_page(&doc, *page_id, page_height);
        let lines = assemble_lines(spans);
        let page_text = page_to_text(lines, page_width);

        if !page_text.trim().is_empty() {
            full_text.push_str(&page_text);
            full_text.push('\n');
        }
    }

    Ok(full_text)
}

// ─────────────────────────────────────────────────────────────────────────────
// § TAURI IPC COMMAND
// ─────────────────────────────────────────────────────────────────────────────

/// Tauri-invokable command for extracting spatially ordered text from a local PDF.
#[tauri::command]
pub fn extract_pdf_text(path: String) -> Result<String, String> {
    extract_text_from_pdf(&path)
}

// ─────────────────────────────────────────────────────────────────────────────
// § UNIT TESTS
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rect_right_and_bottom() {
        let r = Rect { x: 10.0, y: 20.0, width: 100.0, height: 15.0 };
        assert_eq!(r.right(),  110.0);
        assert_eq!(r.bottom(),  35.0);
    }

    #[test]
    fn rect_mid_coords() {
        let r = Rect { x: 0.0, y: 0.0, width: 200.0, height: 40.0 };
        assert_eq!(r.mid_x(), 100.0);
        assert_eq!(r.mid_y(),  20.0);
    }

    #[test]
    fn text_matrix_translate() {
        let m = TextMatrix::identity();
        let m2 = m.translate(50.0, 100.0);
        assert!((m2.e - 50.0).abs() < 0.01, "e={}", m2.e);
        assert!((m2.f - 100.0).abs() < 0.01, "f={}", m2.f);
    }

    #[test]
    fn estimate_width_proportional() {
        let w = estimate_width("test", 12.0);
        assert!((w - 24.0).abs() < 0.01, "width={}", w);
    }

    #[test]
    fn percentile_empty() {
        assert_eq!(percentile(&[], 95.0), 0.0);
    }

    #[test]
    fn percentile_single() {
        assert_eq!(percentile(&[42.0], 50.0), 42.0);
    }

    #[test]
    fn percentile_p95_of_sorted_range() {
        let data: Vec<f32> = (1..=100).map(|i| i as f32).collect();
        let p95 = percentile(&data, 95.0);
        assert!(p95 >= 94.0 && p95 <= 96.0, "p95={}", p95);
    }

    #[test]
    fn percentile_p05_of_sorted_range() {
        let data: Vec<f32> = (1..=100).map(|i| i as f32).collect();
        let p5 = percentile(&data, 5.0);
        assert!(p5 >= 4.0 && p5 <= 6.0, "p5={}", p5);
    }

    #[test]
    fn full_width_by_ratio() {
        let line = TextLine {
            text: "Paper Title".into(),
            bbox: Rect { x: 50.0, y: 5.0, width: 357.0, height: 14.0 },
            font_size: 14.0,
        };
        assert!(is_full_width(&line, 595.0));
    }

    #[test]
    fn full_width_by_center_span() {
        let line = TextLine {
            text: "Abstract".into(),
            bbox: Rect { x: 59.5, y: 20.0, width: 476.0, height: 10.0 },
            font_size: 10.0,
        };
        assert!(is_full_width(&line, 595.0));
    }

    #[test]
    fn not_full_width_narrow_column() {
        let line = TextLine {
            text: "Some body text in left column.".into(),
            bbox: Rect { x: 50.0, y: 100.0, width: 200.0, height: 10.0 },
            font_size: 10.0,
        };
        assert!(!is_full_width(&line, 595.0));
    }

    #[test]
    fn assemble_spans_same_baseline() {
        let spans = vec![
            TextSpan { text: "Hello".into(), bbox: Rect { x: 50.0, y: 100.0, width: 30.0, height: 10.0 }, font_size: 10.0 },
            TextSpan { text: "World".into(), bbox: Rect { x: 85.0, y: 101.0, width: 30.0, height: 10.0 }, font_size: 10.0 },
        ];
        let lines = assemble_lines(spans);
        assert_eq!(lines.len(), 1, "Should merge into 1 line");
        assert!(lines[0].text.contains("Hello"), "line={}", lines[0].text);
        assert!(lines[0].text.contains("World"), "line={}", lines[0].text);
    }

    #[test]
    fn assemble_spans_different_baselines() {
        let spans = vec![
            TextSpan { text: "Line 1".into(), bbox: Rect { x: 50.0, y: 100.0, width: 40.0, height: 10.0 }, font_size: 10.0 },
            TextSpan { text: "Line 2".into(), bbox: Rect { x: 50.0, y: 115.0, width: 40.0, height: 10.0 }, font_size: 10.0 },
        ];
        let lines = assemble_lines(spans);
        assert_eq!(lines.len(), 2, "Should produce 2 separate lines");
    }

    #[test]
    fn header_cutoff_identifies_initial_full_width_lines() {
        let page_width = 595.0_f32;
        let lines = vec![
            TextLine { text: "Title".into(), bbox: Rect { x: 50.0, y: 5.0, width: 400.0, height: 20.0 }, font_size: 20.0 },
            TextLine { text: "Authors".into(), bbox: Rect { x: 50.0, y: 30.0, width: 400.0, height: 12.0 }, font_size: 12.0 },
            TextLine { text: "Body text".into(), bbox: Rect { x: 50.0, y: 60.0, width: 200.0, height: 10.0 }, font_size: 10.0 },
        ];
        let cut = header_cutoff(&lines, page_width);
        assert_eq!(cut, 2, "Should skip 2 full-width header lines, got {}", cut);
    }

    fn make_line(x: f32, y: f32, w: f32) -> TextLine {
        TextLine {
            text: format!("text at x={}", x),
            bbox: Rect { x, y, width: w, height: 10.0 },
            font_size: 10.0,
        }
    }

    #[test]
    fn segment_body_detects_two_columns() {
        let page_width = 595.0_f32;

        let mut body: Vec<TextLine> = Vec::new();
        for i in 0..8 {
            body.push(make_line(50.0,  (i as f32) * 12.0, 200.0));
            body.push(make_line(310.0, (i as f32) * 12.0, 200.0));
        }

        match segment_body(body, page_width) {
            ColumnBand::TwoColumn { left, right } => {
                assert_eq!(left.len(), 8,  "Expected 8 left lines, got {}",  left.len());
                assert_eq!(right.len(), 8, "Expected 8 right lines, got {}", right.len());
            }
            _ => panic!("Expected TwoColumn layout"),
        }
    }

    #[test]
    fn segment_body_falls_back_to_single_column() {
        let page_width = 595.0_f32;

        let body: Vec<TextLine> = (0..10).map(|i| {
            make_line(50.0, (i as f32) * 12.0, 450.0)
        }).collect();

        match segment_body(body, page_width) {
            ColumnBand::SingleColumn(_) => {}
            _ => panic!("Expected SingleColumn fallback for full-width body lines"),
        }
    }

    #[test]
    fn extract_text_from_pdf_nonexistent_file() {
        let result = extract_text_from_pdf("/nonexistent/path/file.pdf");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("PDF not found"), "Error message should mention file not found");
    }

    #[test]
    fn extract_text_from_pdf_wrong_extension() {
        let result = extract_text_from_pdf("Cargo.toml");
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("does not appear to be a PDF"));
    }
}
