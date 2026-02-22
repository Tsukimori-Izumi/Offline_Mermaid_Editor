import webview
import threading
import sys
import os
import json
from pathlib import Path

class Api:
    def __init__(self, window):
        self.window = window
        self.history_file = Path(__file__).resolve().parent / 'history.json'

    def save_file(self, content):
        """Save text content to a .mmd file"""
        # Note: webview.SAVE_DIALOG is deprecated in newer versions, use webview.OPEN_DIALOG type constants
        # To avoid the console warning, we use the string value or the new constant if available
        # But for compatibility we keep SAVE_DIALOG if it exists, otherwise fallback to 1 (usually SAVE)
        dialog_type = getattr(webview, 'SAVE_DIALOG', 1)
        file_types = ('Mermaid file (*.mmd)', 'All files (*.*)')
        try:
            filename = self.window.create_file_dialog(dialog_type, directory='', save_filename='diagram.mmd', file_types=file_types)
            if filename and filename[0]:
                with open(filename[0], 'w', encoding='utf-8') as f:
                    f.write(content)
                return True
        except Exception as e:
            print(f"Error saving file: {e}")
        return False

    def open_file(self):
        """Open a .mmd file and return its content"""
        file_types = ('Mermaid file (*.mmd)', 'All files (*.*)')
        try:
            filename = self.window.create_file_dialog(webview.OPEN_DIALOG, allow_multiple=False, file_types=file_types)
            if filename and filename[0]:
                with open(filename[0], 'r', encoding='utf-8') as f:
                    return f.read()
        except Exception as e:
            print(f"Error opening file: {e}")
        return None

    def save_svg(self, svg_data):
        """Save SVG data to a file"""
        dialog_type = getattr(webview, 'SAVE_DIALOG', 1)
        file_types = ('SVG Image (*.svg)', 'All files (*.*)')
        try:
            filename = self.window.create_file_dialog(dialog_type, directory='', save_filename='diagram.svg', file_types=file_types)
            if filename and filename[0]:
                with open(filename[0], 'w', encoding='utf-8') as f:
                    f.write(svg_data)
                return True
        except Exception as e:
            print(f"Error saving SVG: {e}")
        return False

    def load_history(self):
        """Load history from local json file"""
        try:
            if self.history_file.exists():
                with open(self.history_file, 'r', encoding='utf-8') as f:
                    return f.read()
        except Exception as e:
            print(f"Error loading history: {e}")
        return None

    def save_history(self, history_json):
        """Save history to local json file"""
        try:
            with open(self.history_file, 'w', encoding='utf-8') as f:
                f.write(history_json)
            return True
        except Exception as e:
            print(f"Error saving history: {e}")
        return False

def get_entrypoint():
    """Return the absolute path to the main HTML file"""
    base_dir = Path(__file__).resolve().parent
    return str(base_dir / 'web' / 'index.html')

if __name__ == '__main__':
    window = webview.create_window(
        'Offline Mermaid Editor',
        url=get_entrypoint(),
        width=1200,
        height=800,
        min_size=(800, 600),
        text_select=True,
    )
    api = Api(window)
    window.expose(api.save_file, api.open_file, api.save_svg, api.load_history, api.save_history)
    
    # Enable debug mode if --debug flag is passed
    debug = '--debug' in sys.argv
    
    webview.start(debug=debug)
