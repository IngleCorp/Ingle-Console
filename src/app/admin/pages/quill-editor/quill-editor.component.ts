import { Component } from '@angular/core';

@Component({
  selector: 'app-quill-editor',
  templateUrl: './quill-editor.component.html',
  styleUrl: './quill-editor.component.scss'
})
export class QuillEditorComponent {
  editorContent = '';
  editorConfig = {
    toolbar: [
      ['bold', 'italic', 'underline'],  // Toggle buttons
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],  // Lists
      ['blockquote', 'code-block'],  // Blocks
      [{ 'header': 1 }, { 'header': 2 }],   
      [{ 'script': 'sub'}, { 'script': 'super' }],  // Superscript/Subscript
      [{ 'indent': '-1'}, { 'indent': '+1' }],  // Indentation
      [{ 'direction': 'rtl' }],  // Text direction
   
      [{ 'size': ['small', false, 'large', 'huge'] }],  // Font size
      [{ 'color': [] }, { 'background': [] }],  // Color
      [{ 'font': [] }],  // Font
      [{ 'clean': 'source' }],  // Remove formatting
      ['formula'],  // Math formula
      ['clean'],  // Remove formatting

      [{ 'align': [] }],  // Alignment
      ['link', 'image', 'video']  // Add links and images
    ]
  };
}
