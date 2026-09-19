'use strict';

/* ==========================================================================
   MANIESTA LABEL — Firebase Storage
   Image uploads with client-side resize + validation
   ========================================================================== */

import { getStorage } from './firebase-init.js';
import { FEATURES } from './firebase-config.js';

const MAX_INPUT_SIZE = 10 * 1024 * 1024;   // 10 MB raw input limit
const TARGET_MAX_DIM = 1400;                // resize to max 1400px on long edge
const JPEG_QUALITY = 0.85;

const Storage = {
  async _load() {
    return import('https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js');
  },

  async _bucket() {
    if (!FEATURES.STORAGE) throw new Error('Storage is not enabled');
    const s = await getStorage();
    if (!s) throw new Error('Storage unavailable');
    return s;
  },

  /* --- File validation --- */
  validate(file) {
    if (!file) return 'No file selected.';
    const valid = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (valid.indexOf(file.type) === -1) return 'Only JPG, PNG, or WebP files are allowed.';
    if (file.size > MAX_INPUT_SIZE) return 'File is too large. Maximum is 10 MB.';
    return null;
  },

  /* --- Client-side resize via canvas --- */
  async resize(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width <= TARGET_MAX_DIM && height <= TARGET_MAX_DIM) {
          // No resize needed, return original
          resolve(file);
          return;
        }
        const ratio = Math.min(TARGET_MAX_DIM / width, TARGET_MAX_DIM / height);
        const newW = Math.round(width * ratio);
        const newH = Math.round(height * ratio);
        const canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, newW, newH);
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Resize failed')); return; }
          const resized = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
          resolve(resized);
        }, 'image/jpeg', JPEG_QUALITY);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
      img.src = url;
    });
  },

  /* --- Upload one image --- */
  async upload(productId, file, index, onProgress) {
    const err = this.validate(file);
    if (err) throw new Error(err);

    const resized = await this.resize(file);
    const bucket = await this._bucket();
    const { ref, uploadBytesResumable, getDownloadURL } = await this._load();

    const ext = resized.name.split('.').pop().toLowerCase();
    const path = 'products/' + productId + '/image-' + Date.now() + '-' + index + '.' + ext;
    const storageRef = ref(bucket, path);

    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, resized, {
        contentType: resized.type,
        cacheControl: 'public, max-age=31536000'
      });

      task.on('state_changed',
        (snap) => {
          if (onProgress) {
            const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
            onProgress(pct);
          }
        },
        (err) => reject(err),
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        }
      );
    });
  },

  /* --- Upload multiple --- */
  async uploadMany(productId, files, onProgress) {
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      const url = await this.upload(productId, files[i], i, (pct) => {
        if (onProgress) onProgress(i, files.length, pct);
      });
      urls.push(url);
    }
    return urls;
  },

  /* --- Delete single image by URL --- */
  async deleteByUrl(url) {
    if (!url) return;
    try {
      const bucket = await this._bucket();
      const { ref, deleteObject } = await this._load();
      const r = ref(bucket, url);
      await deleteObject(r);
    } catch (err) {
      // Silently ignore — file may not exist
      console.warn('[Storage] delete failed:', err.message);
    }
  },

  /* --- Delete all images for a product --- */
  async deleteProductFolder(productId) {
    try {
      const bucket = await this._bucket();
      const { ref, listAll, deleteObject } = await this._load();
      const folderRef = ref(bucket, 'products/' + productId);
      const list = await listAll(folderRef);
      await Promise.all(list.items.map(i => deleteObject(i)));
    } catch (err) {
      console.warn('[Storage] folder cleanup failed:', err.message);
    }
  }
};

window.MN_Storage = Storage;
