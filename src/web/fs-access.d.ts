/** File System Access API 类型声明 */
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemDirectoryHandle {
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  values(): AsyncIterableIterator<FileSystemHandle>;
}

interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
  move(destinationDir: FileSystemDirectoryHandle, newName?: string): Promise<void>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string): Promise<void>;
  truncate(size: number): Promise<void>;
  close(): Promise<void>;
}

type FileSystemHandle = FileSystemDirectoryHandle | FileSystemFileHandle;

type WellKnownDirectory = 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';

interface DirectoryPickerOptions {
  mode?: 'read' | 'readwrite';
  startIn?: WellKnownDirectory | FileSystemHandle;
}

interface OpenFilePickerOptions {
  multiple?: boolean;
  types?: { description: string; accept: Record<string, string[]> }[];
  mode?: 'read' | 'readwrite';
}

interface Window {
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
}

type PermissionState = 'granted' | 'denied' | 'prompt';
