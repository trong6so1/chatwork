export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error instanceof Error ? error.message : error || '');
  },
  debug: (message: string, meta?: any) => {
    // Để an toàn, chúng ta có thể kiểm tra biến môi trường DEBUG trước khi log
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] ${message}`, meta ? JSON.stringify(meta) : '');
    }
  }
};
