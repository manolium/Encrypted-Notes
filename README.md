A desktop application for securely editing text files locally. This application encrypts and decrypts files using strong AES-GCM encryption derived from a user-provided key word (password).

The user interface is built with standard web technologies (HTML, CSS, JavaScript) and rendered in a native desktop window using **PyWebView**. A lightweight **Flask** server runs locally in the background to handle file operations and cryptographic tasks powered by the Python **cryptography** library.

**Features:**

*   Create new encrypted files or open existing ones.
*   Text is only decrypted in memory during editing.
*   Files are automatically re-encrypted upon saving.
*   Uses PBKDF2 for key derivation and AES-GCM for authenticated encryption.
*   Clean, modern-looking user interface.
*   Basic text editing features (word/line/char count, font size setting).
*   Settings panel to toggle developer tools (if supported by the backend).

**Disclaimer:** The security of your files depends entirely on the strength and secrecy of the key word you choose. Use strong, unique passwords. This is a functional example; review security best practices before using for highly sensitive data.

**Running the Application:**

1.  Clone the repository.
   
2.  Install the required dependencies :
pip install Flask pywebview cryptography

3.  Navigate to the project directory in your terminal.
   
4.  Run `python app.py`.

**Technology Stack:**

*   **Backend:** Python, Flask
*   **GUI Wrapper:** PyWebView
*   **Frontend:** HTML, CSS, JavaScript
*   **Cryptography:** Python `cryptography` library (AES-GCM, PBKDF2HMAC, SHA256)
