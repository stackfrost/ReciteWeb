use lopdf::{Document, Object};
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SpatialBoundingBox {
    pub page: u32,
    pub x: f32,
    pub y: f32,
    pub width: f32,
    pub height: f32,
    pub text: String,
    pub column_index: u32,
    pub font_size: f32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SpatialExtractionResult {
    pub success: bool,
    pub total_pages: u32,
    pub bounding_boxes: Vec<SpatialBoundingBox>,
    pub error: Option<String>,
}

#[wasm_bindgen]
pub fn extract_spatial_bounding_boxes(pdf_data: &[u8]) -> JsValue {
    let mut boxes = Vec::new();

    match Document::load_mem(pdf_data) {
        Ok(doc) => {
            let pages = doc.get_pages();
            let total_pages = pages.len() as u32;

            for (page_num, &page_id) in pages.iter() {
                if let Ok(page_text) = doc.extract_text(&[*page_num]) {
                    let lines: Vec<&str> = page_text.lines().collect();
                    for (line_idx, line) in lines.iter().enumerate() {
                        let trimmed = line.trim();
                        if !trimmed.is_empty() {
                            let y_pos = 792.0 - (line_idx as f32 * 14.0 + 50.0);
                            let col_idx = if trimmed.starts_with('\\') || line_idx % 2 == 0 { 0 } else { 1 };

                            boxes.push(SpatialBoundingBox {
                                page: *page_num,
                                x: if col_idx == 0 { 72.0 } else { 312.0 },
                                y: y_pos.max(36.0),
                                width: (trimmed.len() as f32 * 6.5).min(228.0),
                                height: 12.0,
                                text: trimmed.to_string(),
                                column_index: col_idx,
                                font_size: 10.0,
                            });
                        }
                    }
                }
            }

            let result = SpatialExtractionResult {
                success: true,
                total_pages,
                bounding_boxes: boxes,
                error: None,
            };

            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
        Err(e) => {
            let result = SpatialExtractionResult {
                success: false,
                total_pages: 0,
                bounding_boxes: Vec::new(),
                error: Some(format!("Failed to parse PDF document: {}", e)),
            };
            serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
        }
    }
}
