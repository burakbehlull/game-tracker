const axios = require('axios');
const SystemConfig = require('../models/SystemConfig');

class ImageUploadService {
  constructor() {
    this.cdns = [
      {
        id: 'imgbb',
        name: 'ImgBB',
        uploadUrl: 'https://api.imgbb.com/1/upload',
        apiKey: process.env.IMGBB_API_KEY,
        upload: this.uploadToImgBB.bind(this)
      },
      {
        id: 'freeimage',
        name: 'FreeImage',
        uploadUrl: 'https://freeimage.host/api/1/upload',
        apiKey: process.env.FREEIMAGE_API_KEY,
        upload: this.uploadToFreeImage.bind(this)
      },
      {
        id: 'cloudinary',
        name: 'Cloudinary',
        apiKey: process.env.CLOUDINARY_URL,
        upload: this.uploadToCloudinary.bind(this)
      }
    ];
  }

  async getActiveCDNIndex() {
    let config = await SystemConfig.findOne({ key: 'active_cdn_index' });
    if (!config) {
      config = await SystemConfig.create({
        key: 'active_cdn_index',
        value: 0,
        description: 'Current active CDN index for sequential failover'
      });
    }
    return config.value;
  }

  async setActiveCDNIndex(index) {
    await SystemConfig.updateOne(
      { key: 'active_cdn_index' },
      { $set: { value: index, updatedAt: new Date() } },
      { upsert: true }
    );
  }

  async getCDNsStatus() {
    const activeIndex = await this.getActiveCDNIndex();
    const fullCDNs = await SystemConfig.findOne({ key: 'full_cdns' });
    const fullCDNIds = fullCDNs ? fullCDNs.value : [];

    return this.cdns.map((cdn, index) => ({
      id: cdn.id,
      name: cdn.name,
      isActive: index === activeIndex,
      isFull: fullCDNIds.includes(cdn.id),
      priority: index + 1
    }));
  }

  async markCDNAsFull(cdnId) {
    let config = await SystemConfig.findOne({ key: 'full_cdns' });
    if (!config) {
      config = await SystemConfig.create({ key: 'full_cdns', value: [] });
    }
    
    if (!config.value.includes(cdnId)) {
      config.value.push(cdnId);
      await config.save();
    }

    // Switch to next CDN
    const currentIndex = await this.getActiveCDNIndex();
    if (currentIndex < this.cdns.length - 1) {
      await this.setActiveCDNIndex(currentIndex + 1);
    }
  }

  async uploadImage(base64Data) {
    let startIndex = await this.getActiveCDNIndex();
    
    for (let i = startIndex; i < this.cdns.length; i++) {
      const cdn = this.cdns[i];
      
      // Skip if no API key
      if (!cdn.apiKey) {
        console.warn(`CDN ${cdn.name} is missing API key, skipping...`);
        continue;
      }

      try {
        const url = await cdn.upload(base64Data, cdn);
        if (url) return url;
      } catch (error) {
        console.error(`Upload to ${cdn.name} failed:`, error.message);
        
        // Check if error is related to quota
        const errorMessage = error.response?.data?.error?.message || error.message || '';
        if (errorMessage.toLowerCase().includes('quota') || 
            errorMessage.toLowerCase().includes('limit') || 
            error.response?.status === 402 || 
            error.response?.status === 429) {
          
          await this.markCDNAsFull(cdn.id);
          // Loop will continue to next CDN
        } else {
          // Other errors might be temporary, but let's try next one anyway
          continue;
        }
      }
    }

    throw new Error('Tüm CDN kotaları dolmuş veya servisler kullanılamıyor.');
  }

  async uploadToImgBB(base64Data, cdn) {
    const formData = new URLSearchParams();
    formData.append('image', base64Data.replace(/^data:image\/\w+;base64,/, ''));
    
    const response = await axios.post(`${cdn.uploadUrl}?key=${cdn.apiKey}`, formData);
    return response.data?.data?.url;
  }

  async uploadToFreeImage(base64Data, cdn) {
    const formData = new URLSearchParams();
    formData.append('source', base64Data.replace(/^data:image\/\w+;base64,/, ''));
    formData.append('action', 'upload');
    formData.append('format', 'json');
    
    const response = await axios.post(`${cdn.uploadUrl}?key=${cdn.apiKey}`, formData);
    return response.data?.image?.url;
  }

  async uploadToCloudinary(base64Data, cdn) {
    // Cloudinary usually needs cloudinary package, but we can use their REST API
    // Or if CLOUDINARY_URL is present, we can parse it
    // For simplicity, let's assume this is implemented or skip for now if keys are missing
    throw new Error('Cloudinary implementation pending');
  }
}

module.exports = new ImageUploadService();
