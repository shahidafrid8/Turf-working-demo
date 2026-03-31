# TurfTime App Design Guidelines

## Design Approach
Spotify-inspired mobile-first turf booking experience with energetic green (#00FF00 or similar vibrant green), black (#000000), and white (#FFFFFF) color scheme. Clean, minimalistic interface with smooth scrolling and intuitive navigation patterns.

## Logo
Stylized "T" lettermark integrated with a minimalist turf field icon (simple grass lines or field markings). Primary logo in energetic green on black backgrounds, reversed to black on green accents.

## Typography
- **Primary Font**: Circular (Spotify's font) or similar modern sans-serif (Montserrat, Inter)
- **Headings**: Bold, 24-32px for screen titles
- **Subheadings**: Semibold, 18-20px for section headers
- **Body Text**: Regular, 14-16px for descriptions and details
- **Pricing/Time**: Bold, 16-18px for emphasis

## Layout System
Mobile-first design using Tailwind spacing units: 2, 4, 6, 8, 12, 16 for consistent rhythm.

## Screen Specifications

### Home Screen
- **Top Navigation**: Black header with TurfTime logo (left), search icon, profile avatar (right)
- **Hero Section**: Greeting text "Find Your Perfect Turf" with energetic green accent line
- **Featured Turfs**: Horizontal scrolling card carousel with:
  - Large turf images (rounded corners)
  - Turf name overlay
  - Location and availability indicators
  - Green "Book Now" CTA buttons
- **Categories**: Filter chips (Football, Cricket, Basketball) with green active states
- **Available Now Section**: Vertical list of turf cards with:
  - Thumbnail images (left)
  - Turf details (name, location, rating)
  - Availability status in green
  - Quick booking button
- **Bottom Navigation**: Black bar with 5 icons (Home-green, Search, Bookings, Favorites, Profile)

### Booking Screen
- **Header**: Turf name, back button, share icon
- **Hero Image**: Full-width turf photo (rounded bottom corners)
- **Turf Details**: Location, rating, amenities icons (white on black cards)
- **Date Selector**: Horizontal scrolling calendar with green selected state
- **Time Slot Grid**: 3-column grid showing:
  - Morning slots (6AM-12PM) - regular pricing
  - Afternoon slots (12PM-6PM) - mid pricing with green highlight
  - Evening slots (6PM-11PM) - premium pricing with darker cards
  - Each slot shows time and price, green border for selected
- **Duration Selector**: Dropdown for 1hr, 1.5hr, 2hr options
- **Fixed Bottom CTA**: Green button "Proceed to Payment" with total amount

### Payment Screen
- **Booking Summary Card**: White text on black background showing:
  - Turf name and time
  - Duration and date
  - Total amount breakdown
- **Payment Split Visual**: Two-column layout:
  - "Pay Now" (left) - 30% in green highlight
  - "Pay at Venue" (right) - 70% in white
- **Payment Method Selection**: Cards for UPI, Card, Wallet with green selected border
- **Partial Payment Info**: Info box explaining payment structure
- **Promo Code**: Expandable section with green apply button
- **Fixed Bottom**: Green "Pay ₹XXX Now" button with secure payment badge

### Confirmation Screen
- **Success Animation**: Green checkmark circle (large, centered)
- **Confirmation Message**: "Booking Confirmed!" in white, large text
- **Booking Details Card**: Black background with:
  - Booking ID in green
  - Turf name and address
  - Date, time, duration
  - QR code for venue check-in
  - Amount paid and balance due
- **Actions**: Two buttons:
  - "View Booking Details" (green filled)
  - "Book Another Turf" (white outlined)
- **Payment Receipt**: Downloadable receipt link in green

## Component Library

### Cards
- Rounded corners (8px radius)
- Black backgrounds with white text
- Green accent borders for active/selected states
- Subtle shadows for depth

### Buttons
- Primary: Energetic green background, black text, bold
- Secondary: White outlined, white text
- Disabled: Gray background, reduced opacity
- All buttons with 12px padding, rounded corners

### Input Fields
- Black background, white text
- Green bottom border on focus
- Placeholder text in gray
- Error states with red accents

### Navigation
- Bottom nav: 5 fixed icons, green for active
- Tab bars: Horizontal scrolling with green underline indicator
- Back buttons: White arrow on black header

## Images
- **Home Screen**: Multiple turf photos showing grass fields with goal posts, nets, or court markings
- **Booking Screen Hero**: Large, high-quality turf facility image showing the actual playing surface
- **Card Thumbnails**: Cropped turf images focusing on the playing area
- Use real sports facility photography with vibrant green grass when possible

## Interactions
- Smooth scrolling throughout
- Slide-in animations for screen transitions
- Haptic feedback on selections
- Pull-to-refresh on home screen
- Skeleton loaders in black/green while loading

## Accessibility
- Minimum touch targets: 44x44px
- High contrast between green and black
- Clear focus states with green indicators
- Readable font sizes (minimum 14px)