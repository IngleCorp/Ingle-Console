import Quill from 'quill';
import QuillBetterTable from 'quill-better-table';
import 'quill-better-table/dist/quill-better-table.css';

QuillBetterTable.register();
Quill.register(
  {
    'modules/better-table': QuillBetterTable
  },
  true
);
