import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function uploadFile(req: Request, res: Response) {
  try {
    const { file, filename } = req.body;
    if (!file) {
      return res.status(400).json({ error: 'No file data provided' });
    }

    // Check if it has the base64 data prefix: "data:image/jpeg;base64,..."
    const matches = file.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let extension = 'png';

    if (matches && matches.length === 3) {
      const mimeType = matches[1];
      buffer = Buffer.from(matches[2], 'base64');
      
      // Map mimeType to extension
      const extMatch = mimeType.match(/\/([a-zA-Z0-9]+)$/);
      if (extMatch) {
        extension = extMatch[1];
      }
    } else {
      // Raw base64 string
      buffer = Buffer.from(file, 'base64');
      if (filename) {
        const ext = path.extname(filename).toLowerCase();
        if (ext) {
          extension = ext.substring(1);
        }
      }
    }

    // Generate random unique filename
    const uniqueName = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
    const targetPath = path.join(process.cwd(), 'uploads', uniqueName);

    // Save file to uploads directory
    fs.writeFileSync(targetPath, buffer);

    // Generate public URL
    const host = req.get('host') || `localhost:${process.env.PORT || 5001}`;
    const protocol = req.protocol === 'https' ? 'https' : 'http';
    const url = `${protocol}://${host}/uploads/${uniqueName}`;

    return res.status(200).json({ url });
  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({ error: 'Failed to upload file' });
  }
}

export async function downloadProxy(req: Request, res: Response) {
  try {
    const { url, filename } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL query parameter is required' });
    }

    // Resolve URL (if relative or missing host)
    let targetUrl = url;
    if (url.startsWith('/uploads') || url.startsWith('uploads/')) {
      const cleanUrl = url.startsWith('/') ? url : `/${url}`;
      const protocol = req.protocol === 'https' ? 'https' : 'http';
      const host = req.get('host') || `localhost:${process.env.PORT || 5001}`;
      targetUrl = `${protocol}://${host}${cleanUrl}`;
    }

    const response = await fetch(targetUrl);
    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch target media: ${response.statusText}` });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Download proxy error:', error);
    return res.status(500).json({ error: 'Internal server error during download proxy' });
  }
}
