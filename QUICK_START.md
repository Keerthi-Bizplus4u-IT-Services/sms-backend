# Quick Start Guide

## 🚀 Running the Updated Application

### 1. Start the Backend Server

```bash
# From the project root directory
nodemon app.js
```

The backend will run on `http://localhost:3001` (or your configured port).

### 2. Start the React Frontend

Open a new terminal and run:

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:5173`.

### 3. Access the Application

Open your browser and navigate to: **http://localhost:5173**

## 🔐 Login

You'll be redirected to the login page. Use existing credentials from your database:

```
Email: [your database user email]
Password: [your database user password]
```

## 📱 Navigation

After logging in, you can access:

- **Dashboard** - `/` (Home page)
- **Students** - `/students` (List with Avatar component)
- **Teachers** - `/teachers`
- **Parents** - `/parents`
- **📚 Books** - `/books` (NEW - MUI DataGrid with pagination)
- **💰 Fees** - `/fees` (NEW - MUI DataGrid with tabs)

## ✨ New Features to Test

### All Books Page
1. Click "Books" in the sidebar
2. Try pagination (bottom of table)
3. Try column filters (click filter icon in column headers)
4. Try deleting a book (trash icon)
5. See empty state (if no books exist)

### All Fees Page
1. Click "Fees" in the sidebar
2. Switch between "Fee Details" and "Transactions" tabs
3. Try pagination on both tabs
4. View formatted currency values

### Authentication
1. Logout using the avatar menu (top right)
2. Try accessing protected routes (will redirect to login)
3. Login again (session persists)

## 🐛 Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Verify database connection in `config.js`
- Check for any syntax errors in new controller files

### Frontend won't start
- Run `npm install` in the frontend directory
- Check for port conflicts on 5173
- Clear browser cache

### Login not working
- Check browser console for errors
- Verify `/api/authenticate` endpoint is accessible
- Check database user table has valid credentials
- Verify session middleware is configured in `app.js`

### Data not loading
- Check browser Network tab for failed requests
- Verify database tables exist (library, feedetails, feetransactions)
- Check backend console for SQL errors

### Photos not displaying
- Verify photos exist in `/uploads/` or `/photos/` directory
- Check static file serving in `app.js`
- Try hard refresh (Ctrl+F5)

## 📋 Quick Tips

1. **Development Mode**: Both servers support hot reload
   - Backend: nodemon watches for file changes
   - Frontend: Vite HMR updates instantly

2. **API Proxy**: Frontend proxies API calls to backend automatically
   - No CORS issues in development
   - Configured in `vite.config.ts`

3. **TypeScript**: Type errors will show in VS Code
   - Red squiggly lines indicate issues
   - Fix before testing

4. **Browser DevTools**:
   - F12 to open
   - Network tab for API calls
   - Console for errors
   - Application tab for cookies/session

## 🎯 What's Different?

### Before (EJS)
- Server-side rendered pages
- Full page reload on navigation
- jQuery DataTables
- Basic pagination

### After (React + MUI)
- Client-side rendered components
- Instant navigation (SPA)
- MUI DataGrid with advanced features
- Server-side pagination
- Better user experience
- Modern, responsive UI

## 📚 Learn More

- Check `REACT_MIGRATION.md` for detailed documentation
- Review component code in `frontend/src/`
- Explore API endpoints in `controllers/api-*.js`

---

**Need Help?** Check the troubleshooting section or review the implementation summary.
