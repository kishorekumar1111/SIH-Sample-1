# EduMesh Deployment Guide

## 🚀 Deployment Options

### Option 1: Netlify (Recommended)

1. **Connect Repository:**
   - Go to [Netlify](https://netlify.com)
   - Connect your GitHub repository
   - The `netlify.toml` file is already configured

2. **Build Settings:**
   - Base directory: `SIH-Prg` (or leave empty for root)
   - Build command: `npm run build`
   - Publish directory: `SIH-Prg/dist`

3. **Alternative Manual Settings:**
   - If automatic detection fails, manually set:
   - Base directory: `SIH-Prg`
   - Build command: `npm run build`
   - Publish directory: `SIH-Prg/dist`

3. **Environment Variables:**
   - Add your Firebase config in Netlify dashboard
   - Go to Site settings → Environment variables

### Option 2: Vercel

1. **Connect Repository:**
   - Go to [Vercel](https://vercel.com)
   - Import your GitHub repository
   - The `vercel.json` file is already configured

2. **Build Settings:**
   - Framework: Vite
   - Root directory: `SIH-Sample-1/SIH-Prg`
   - Build command: `npm run build`
   - Output directory: `dist`

### Option 3: GitHub Pages

1. **Build the project:**
   ```bash
   cd SIH-Sample-1/SIH-Prg
   npm run build
   ```

2. **Deploy to GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `gh-pages` (create this branch)
   - Folder: `/ (root)`

3. **Push dist folder to gh-pages:**
   ```bash
   git subtree push --prefix SIH-Sample-1/SIH-Prg/dist origin gh-pages
   ```

## 🔧 Local Build Test

Before deploying, test the build locally:

```bash
cd SIH-Sample-1/SIH-Prg
npm install
npm run build
npm run preview
```

## 📱 PWA Features

The app includes:
- ✅ Service Worker (for offline functionality)
- ✅ Web App Manifest
- ✅ Responsive design
- ✅ Offline-first architecture

## 🔥 Firebase Configuration

Make sure to update your Firebase config in `src/assets/firebase.js` with your production settings.

## 🚨 Common Deployment Issues

### Issue: "Could not resolve entry module index.html"
**Solution:** Ensure the build is running from the correct directory (`SIH-Sample-1/SIH-Prg`)

### Issue: "Module not found"
**Solution:** Run `npm install` in the correct directory before building

### Issue: "Build failed"
**Solution:** Check that all dependencies are installed and Node.js version is 18+

## 📊 Performance

The app is optimized for:
- Fast loading with code splitting
- Offline functionality
- Mobile-first design
- Minimal bundle size

## 🌐 Live Demo

Once deployed, your app will be available at:
- Netlify: `https://your-app-name.netlify.app`
- Vercel: `https://your-app-name.vercel.app`
- GitHub Pages: `https://username.github.io/repository-name`
