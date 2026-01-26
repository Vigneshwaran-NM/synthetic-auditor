/**
 * File utility functions
 */

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function getFileIcon(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'zip':
      return '📦';
    case 'xml':
      return '📄';
    case 'json':
      return '📋';
    case 'pcap':
      return '📡';
    case 'log':
      return '📝';
    default:
      return '📎';
  }
}

export function validateFiles(files: File[]): { valid: File[]; invalid: { file: File; reason: string }[] } {
  const valid: File[] = [];
  const invalid: { file: File; reason: string }[] = [];
  
  const allowedTypes = [
    'application/zip',
    'application/x-zip-compressed',
    'text/xml',
    'application/json',
    'application/octet-stream', // For pcap files
    'text/plain',
  ];
  
  const allowedExtensions = ['.zip', '.xml', '.json', '.pcap', '.log', '.txt'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  files.forEach(file => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    // Check file type
    const isTypeValid = allowedTypes.includes(file.type) || 
                       file.type === '' || // Some files may not have a type
                       allowedExtensions.includes(extension);
    
    // Check file size
    const isSizeValid = file.size <= maxSize;
    
    // Check extension
    const isExtensionValid = allowedExtensions.includes(extension);
    
    if (!isTypeValid && !isExtensionValid) {
      invalid.push({ 
        file, 
        reason: `Invalid file type. Supported: ${allowedExtensions.join(', ')}` 
      });
    } else if (!isSizeValid) {
      invalid.push({ 
        file, 
        reason: `File too large (${formatFileSize(file.size)}). Max size: 100MB` 
      });
    } else {
      valid.push(file);
    }
  });
  
  return { valid, invalid };
}

// Create a ZIP file from multiple files (for testing)
export async function createTestZip(files: { name: string; content: string }[]): Promise<Blob> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  
  files.forEach(file => {
    zip.file(file.name, file.content);
  });
  
  return zip.generateAsync({ type: 'blob' });
}

// Extract filename without extension
export function getBaseFilename(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}