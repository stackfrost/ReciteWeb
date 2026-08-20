// ─────────────────────────────────────────────────────────────────────────────
// ReciteAI — Tauri v2 Backend
// src-tauri/src/lib.rs
//
// Security Surface:
//   • All LLM API keys are stored EXCLUSIVELY in the OS-level Stronghold vault.
//   • The vault file is encrypted with Argon2id KDF + libsodium XSalsa20-Poly1305.
//   • No plaintext key material ever reaches the filesystem outside the vault.
// ─────────────────────────────────────────────────────────────────────────────

use tauri::Manager;

/// Initialise the Tauri application with the Stronghold plugin.
///
/// The Stronghold builder requires a password hashing function (PHF) that
/// derives a 32-byte symmetric key from the user's PIN before the vault is
/// opened. We use Argon2id with OWASP-recommended parameters:
///   - memory_cost: 64 MiB
///   - time_cost:   3 iterations
///   - parallelism: 1
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(
            tauri_plugin_stronghold::Builder::new(|password| {
                use argon2::{
                    password_hash::SaltString,
                    Argon2, Params, Version, Algorithm,
                };

                // Derive a 32-byte vault key from the user's PIN via Argon2id.
                // The salt is application-scoped and fixed — the PIN itself is
                // the primary entropy source.  Individual per-secret nonces are
                // managed by Stronghold internally.
                let salt = SaltString::from_b64("UmVjaXRlQUktVmF1bHQ")
                    .expect("ReciteAI: Stronghold salt is static and must be valid");

                let params = Params::new(
                    64 * 1024, // 64 MiB memory
                    3,         // 3 passes
                    1,         // 1 lane
                    Some(32),  // 32-byte output key
                )
                .expect("ReciteAI: Argon2 parameter construction must succeed");

                let argon2 = Argon2::new(
                    Algorithm::Argon2id,
                    Version::V0x13,
                    params,
                );

                let mut key_bytes = [0u8; 32];
                argon2
                    .hash_password_into(password, salt.as_bytes(), &mut key_bytes)
                    .expect("ReciteAI: Argon2 KDF must not fail for valid inputs");

                key_bytes.to_vec()
            })
            .build(),
        )
        .setup(|app| {
            // Resolve the OS app-data directory at runtime.
            // The vault file path is: $APP_DATA/recite.hold
            let app_data = app
                .path()
                .app_data_dir()
                .expect("ReciteAI: OS app-data directory must be resolvable");

            println!(
                "[ReciteAI] Stronghold vault directory: {}",
                app_data.display()
            );

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("ReciteAI: Tauri application loop encountered a fatal error");
}
