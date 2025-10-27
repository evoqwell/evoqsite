# EVOQ Product Management Guide

## Overview
Your EVOQ site now has a complete database-driven product management system. You can add, edit, and remove products without touching any code!

## How It Works

### 1. Product Database
All products are stored in Supabase with these fields:
- Name and description
- Price
- Category (peptide, supplement, supplies, other)
- Stock status (in stock, out of stock, pre-order)
- Product image URL
- Certificate of Analysis URL (optional)
- Featured flag (show on homepage)
- Active flag (visible on site)
- Sort order (display order)

### 2. Admin Panel
Access the product management admin at: `https://yoursite.com/admin-products.html`

**Default Password:** `EvoqAdmin2024!`

**Features:**
- Add new products
- Edit existing products
- Activate/deactivate products
- Delete products
- Reorder products (via sort order)
- Mark products as featured

### 3. Dynamic Shop Page
The new shop page (`shop-new.html`) loads products from the database automatically. When you add or update products in the admin panel, they appear immediately on your site.

## Adding New Products

### Step 1: Upload Product Image
1. Upload your product image to your web server or image hosting service
2. Get the direct URL to the image (e.g., `https://yoursite.com/images/new-product.png`)
3. Recommended image size: 300x300px or larger, square aspect ratio

### Step 2: Upload Certificate of Analysis (Optional)
1. Upload the COA PDF to your server
2. Get the direct URL (e.g., `https://yoursite.com/public/COAs/new-product-coa.pdf`)

### Step 3: Add Product in Admin Panel
1. Go to `admin-products.html` and log in
2. Click "Add New Product"
3. Fill in all fields:
   - **Product Name** - e.g., "Tirzepatide 10mg"
   - **Description** - Detailed product description
   - **Price** - Enter price in dollars (e.g., 99.00)
   - **Category** - Select appropriate category
   - **Stock Status** - Choose in stock, out of stock, or pre-order
   - **Image URL** - Paste the image URL from Step 1
   - **COA URL** - Paste the COA URL from Step 2 (if applicable)
   - **Display Order** - Lower numbers appear first (0, 1, 2, etc.)
   - **Featured** - Check to show on homepage
   - **Active** - Check to make visible on site
4. Click "Save Product"

### Step 4: Verify on Site
1. Visit `shop-new.html` to see your new product
2. Test the "Add to Cart" functionality
3. Verify the COA link works (if added)

## Using Supabase Storage (Recommended)

Instead of manually uploading files to your server, you can use Supabase Storage:

### Upload via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the sidebar
3. You'll see two buckets:
   - `product-images` - For product photos
   - `product-coas` - For COA PDFs
4. Click on a bucket and upload files
5. After upload, click the file and copy the public URL
6. Use this URL in the admin panel

### File Naming Best Practices
- Use lowercase letters
- Replace spaces with hyphens
- Be descriptive: `tirzepatide-10mg.png` not `img1.png`
- For COAs: `tirzepatide-coa.pdf`

## Managing Existing Products

### Edit a Product
1. In admin panel, click "Edit" on any product card
2. Modify any fields you want to change
3. Click "Save Product"

### Deactivate a Product (Without Deleting)
1. Click "Deactivate" button on the product card
2. Product will be hidden from the shop but data is preserved
3. Click "Activate" to make it visible again

### Delete a Product
1. Click "Delete" button on the product card
2. Confirm deletion (this cannot be undone!)
3. Product and all its data will be permanently removed

### Reorder Products
1. Edit each product
2. Change the "Display Order" number
3. Lower numbers appear first (0, 1, 2, 3...)
4. Save changes

## Featured Products
Featured products can appear in special sections:
- Check "Featured" when adding/editing a product
- Featured products are highlighted with a badge
- Use for promotions or bestsellers

## Stock Management
Set stock status to:
- **In Stock** - Shows "Add to Cart" button
- **Out of Stock** - Shows disabled "Out of Stock" button
- **Pre-Order** - Shows "Pre-Order" button

## Tips for Success

### Product Images
- Use high-quality images with transparent or white backgrounds
- Keep images consistent in style and size
- Optimize images (compress them) before uploading
- Square format works best (1:1 aspect ratio)

### Product Descriptions
- Be descriptive and informative
- Include dosage, composition, or key features
- Mention research applications
- Keep tone professional

### Pricing
- Include cents (.00) for consistency
- Update prices easily from admin panel
- No need to touch code or redeploy

### COA Management
- Always provide COAs when available
- Name COA files clearly (product-name-coa.pdf)
- Update COAs when you get new batches
- Link directly to the PDF file

## Switching to Database Products

Your site currently uses the old static `shop.html`. To switch to the database version:

1. **Backup**: Keep `shop.html` as `shop-old.html`
2. **Rename**: Rename `shop-new.html` to `shop.html`
3. **Update Navigation**: Links will automatically work since we kept the same filename

## Troubleshooting

### Products Not Showing
- Check product is marked "Active" in admin panel
- Verify image URL is correct and accessible
- Check browser console for errors

### Images Not Loading
- Verify image URL is publicly accessible
- Check file permissions on your server
- Ensure correct file extension (.png, .jpg, .gif)

### COA Link Not Working
- Verify PDF is uploaded and publicly accessible
- Check URL has correct file path
- Ensure PDF is actually a PDF file

### Can't Log In to Admin
- Default password: `EvoqAdmin2024!`
- Password is case-sensitive
- To change password, edit `admin-products.js` line 5

## Security Notes

- Admin panel uses password protection
- Change default password in production
- Only authenticated users can add/edit/delete products
- Public users can only view active products
- Product data is stored securely in Supabase

## Next Steps

1. Add all your current products to the database
2. Test the shop page thoroughly
3. Switch from `shop.html` to database-driven `shop-new.html`
4. Update any links in your navigation
5. Change the default admin password

Need help? Check the console for error messages or contact support.
