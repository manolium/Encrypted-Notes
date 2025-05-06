import tkinter as tk
from tkinter import messagebox
import os
import base64
import threading
import sys
import json
import time

# --- Web Framework & WebView ---
from flask import Flask, request, jsonify, render_template
import webview

# --- Cryptography ---
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidTag

# --- Constants ---
SALT_SIZE = 16
NONCE_SIZE = 12
KEY_SIZE = 32
PBKDF2_ITERATIONS = 390000

# --- Crypto Functions ---
def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(), length=KEY_SIZE, salt=salt,
        iterations=PBKDF2_ITERATIONS, backend=default_backend()
    )
    return kdf.derive(password.encode('utf-8'))

def encrypt_data_bytes(plaintext: str, password: str) -> bytes | None:
    """Encrypts plaintext, returns raw encrypted bytes or None on error."""
    try:
        plaintext_bytes = plaintext.encode('utf-8')
        salt = os.urandom(SALT_SIZE)
        key = derive_key(password, salt)
        nonce = os.urandom(NONCE_SIZE)
        aesgcm = AESGCM(key)
        ciphertext = aesgcm.encrypt(nonce, plaintext_bytes, None)
        encrypted_data_bytes = salt + nonce + ciphertext
        return encrypted_data_bytes # Return raw bytes
    except Exception as e:
        # Keep essential error logging
        print(f"ERROR: Encryption failed: {e}", file=sys.stderr)
        return None

def decrypt_data(encrypted_data_b64: str, password: str) -> str | None:
    try:
        encrypted_data = base64.b64decode(encrypted_data_b64)
        if len(encrypted_data) < SALT_SIZE + NONCE_SIZE:
            print("ERROR: Decryption failed - Data too short", file=sys.stderr)
            return None
        salt = encrypted_data[:SALT_SIZE]
        nonce = encrypted_data[SALT_SIZE:SALT_SIZE + NONCE_SIZE]
        ciphertext = encrypted_data[SALT_SIZE + NONCE_SIZE:]
        key = derive_key(password, salt)
        aesgcm = AESGCM(key)
        plaintext_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext_bytes.decode('utf-8')
    except (InvalidTag, ValueError, TypeError) as e:
        # Keep essential error logging
        print(f"ERROR: Decryption failed (Invalid Key/Data/Format): {e}", file=sys.stderr)
        return None
    except Exception as e:
        print(f"ERROR: Decryption failed: {e}", file=sys.stderr)
        return None

# --- Flask Setup ---
app = Flask(__name__)
# Reduce Flask logging noise
import logging
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR) # Only show errors

# --- PyWebView API Class ---
class Api:
    def __init__(self):
        self.current_filepath = None # Store the active file path

    def _get_window(self):
        """Helper to safely get the window object."""
        if webview.windows:
            return webview.windows[0]
        print("ERROR: No active PyWebView window found.", file=sys.stderr)
        return None

    def _send_save_result(self, status, message, filepath=None):
        """Helper to send save result back to JS."""
        window = self._get_window()
        if window:
            result_data = {'status': status, 'message': message, 'path': filepath}
            js_code = f"window.handleSaveResult({json.dumps(result_data)})"
            try:
                window.evaluate_js(js_code)
            except Exception as e:
                 print(f"ERROR: Failed to send save result to JS: {e}", file=sys.stderr)

    def open_file_dialog(self):
        window = self._get_window()
        if not window: return

        try:
            file_types = ('Encrypted Files (*.enc)', 'Text Files (*.txt)', 'All files (*.*)')
            result = window.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=file_types)

            if result and isinstance(result, tuple) and len(result) > 0:
                filepath = result[0]
                filename = os.path.basename(filepath)
                try:
                    with open(filepath, "rb") as f: content_bytes = f.read()
                    content_b64 = base64.b64encode(content_bytes).decode('utf-8')
                    self.current_filepath = filepath # Store path
                    js_code = f"window.handleFileContent({json.dumps(filename)}, '{content_b64}')" # Send filename only
                    window.evaluate_js(js_code)
                except Exception as e:
                    print(f"ERROR: Error reading file {filepath}: {e}", file=sys.stderr)
                    self.current_filepath = None # Reset path on read error
                    js_code = f"window.handleFileError({json.dumps(f'Error reading file: {e}')})"
                    window.evaluate_js(js_code)
            # else: No need to log cancellation

        except Exception as e:
            print(f"ERROR: EXCEPTION in open_file_dialog try block: {e}", file=sys.stderr)
            self.current_filepath = None # Reset path on dialog error
            try:
                 js_code = f"window.handleFileError({json.dumps(f'Error opening dialog: {e}')})"
                 window.evaluate_js(js_code)
            except Exception as eval_e:
                 print(f"ERROR: Failed to send file dialog error to JS: {eval_e}", file=sys.stderr)

    def save_file(self, key, text, filename_hint):
        window = self._get_window()
        if not window:
             try: self._send_save_result('error', 'Internal application error: Could not get window reference.')
             except: print("ERROR: In save_file - Cannot get window reference and cannot send error.", file=sys.stderr)
             return

        encrypted_bytes = encrypt_data_bytes(text, key)
        if encrypted_bytes is None:
            self._send_save_result('error', 'Encryption failed.')
            return

        save_path = self.current_filepath

        if not save_path:
            try:
                file_types = ('Encrypted Files (*.enc)', 'All files (*.*)')
                dialog_result = window.create_file_dialog(
                    webview.SAVE_DIALOG,
                    directory=os.path.dirname(self.current_filepath) if self.current_filepath else '',
                    save_filename=filename_hint,
                    file_types=file_types
                )
                if dialog_result and isinstance(dialog_result, str):
                    save_path = dialog_result
                else:
                    self._send_save_result('info', 'Save cancelled.')
                    return
            except Exception as e:
                 print(f"ERROR: EXCEPTION during Save As dialog: {e}", file=sys.stderr)
                 self._send_save_result('error', f'Error showing Save As dialog: {e}')
                 return

        if not save_path:
             print("ERROR: save_path is still not set after potential dialog!", file=sys.stderr)
             self._send_save_result('error', 'Internal error: Save path could not be determined.')
             return

        try:
            with open(save_path, "wb") as f:
                f.write(encrypted_bytes)
            self.current_filepath = save_path # Update path AFTER successful write
            self._send_save_result('success', f'File saved successfully.', save_path)
        except IOError as e:
            print(f"ERROR: IOError writing file {save_path}: {e}", file=sys.stderr)
            self._send_save_result('error', f'Error writing file: {e}')
        except Exception as e:
            print(f"ERROR: Unexpected error writing file {save_path}: {e}", file=sys.stderr)
            self._send_save_result('error', f'Unexpected error saving file: {e}')

    # --- REINSTATED toggle_devtools method ---
    def toggle_devtools(self):
        """Toggles the developer console for the webview window if supported."""
        window = self._get_window()
        if window:
            try:
                # This method might not exist on all backends, hence the try-except
                window.toggle_devtools()
            except AttributeError:
                 print("WARN: toggle_devtools() method not supported by this PyWebView backend.", file=sys.stderr)
                 # Optionally inform the user via JS callback that it's not supported
                 try:
                     js_code = f"window.handleDevToolsToggleResult(false, 'Toggle DevTools not supported on this system.')"
                     window.evaluate_js(js_code)
                 except Exception as eval_e:
                     print(f"ERROR: Failed to send DevTools unsupported error to JS: {eval_e}", file=sys.stderr)

            except Exception as e:
                print(f"ERROR: Error calling toggle_devtools: {e}", file=sys.stderr)
                try:
                     js_code = f"window.handleDevToolsToggleResult(false, 'An error occurred trying to toggle DevTools.')"
                     window.evaluate_js(js_code)
                except Exception as eval_e:
                     print(f"ERROR: Failed to send DevTools error to JS: {eval_e}", file=sys.stderr)

# --- Flask Routes ---
@app.route('/')
def index(): return render_template('index.html')

# Keep /decrypt as it's used after opening a file
@app.route('/decrypt', methods=['POST'])
def handle_decrypt():
    data = request.json; key = data.get('key'); encrypted_b64 = data.get('data')
    if not key or not encrypted_b64: return jsonify({'status': 'error', 'message': 'Missing key or data.'}), 400
    decrypted_text = decrypt_data(encrypted_b64, key)
    if decrypted_text is not None:
        return jsonify({'status': 'success', 'text': decrypted_text})
    else:
        return jsonify({'status': 'error', 'message': 'Decryption failed. Check key or file integrity.'}), 400

# --- PyWebView Setup ---
def run_server():
    app.run(host='127.0.0.1', port=5173)

if __name__ == '__main__':
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(1)

    api_instance = Api()
    window_title = "Secure Text Editor"
    window_url = "http://127.0.0.1:5173"

    # REMOVED startup debug block

    try:
         window = webview.create_window(
             window_title,
             window_url,
             width=900,
             height=700,
             resizable=True,
             js_api=api_instance
         )
         # Start with debug OFF by default
         webview.start(debug=False)
         print("Pywebview window closed.") # Keep this final message
    except Exception as e:
         print(f"ERROR: Failed to create pywebview window: {e}", file=sys.stderr) # Log errors

    sys.exit()
