# Configuration Guide

## Customizing the Smart Academic Mentor

### 1. Colors & Theme

#### Primary Colors
Edit CSS variables in `styles.css` (lines 1-20):

```css
:root {
    --primary-color: #4F46E5;        /* Main brand color (buttons, accents) */
    --primary-hover: #4338CA;        /* Hover state for primary color */
    --secondary-color: #10B981;      /* Success/confirmation messages */
    --accent-color: #F59E0B;         /* Notifications, highlights */
}
```

#### Dark Mode Colors
Edit dark theme variables in `styles.css` (lines 22-40):

```css
[data-theme="dark"] {
    --primary-color: #6366F1;
    --background: #0F172A;
    --surface: #1E293B;
    --text-primary: #F1F5F9;
}
```

### 2. Branding

#### Application Name
Edit in `index.html` (line 14 and line 20):

```html
<h1>Your Brand Name</h1>
<p class="subtitle">Your custom tagline</p>
```

Also update the page title (line 6):

```html
<title>Your Brand - Dashboard</title>
```

### 3. Motivational Messages

Edit the `motivationalMessages` array in `script.js` (lines 14-22):

```javascript
this.motivationalMessages = [
    "Your custom message 1! 🎯",
    "Your custom message 2! 💪",
    "Your custom message 3! ⭐"
];
```

### 4. Welcome Messages

Edit `displayWelcomeMessage()` method in `script.js` (lines 500-510):

```javascript
const welcomeMessages = [
    "Your custom welcome message!",
    "Your custom second message!"
];
```

### 5. Quick Actions

#### Modify Existing Actions
Edit buttons in `index.html` (lines 89-111) and their handlers in `script.js` `handleQuickAction()` method (lines 220-250).

#### Add New Actions
1. Add button in HTML:
```html
<button class="quick-action-button" data-action="your-action">
    <svg>...</svg>
    Your Action
</button>
```

2. Add handler in `script.js`:
```javascript
case 'your-action':
    this.addMessage('user', 'User clicked your action');
    // Your custom logic here
    break;
```

### 6. API Configuration

#### Change API Endpoint
Edit the API URL in `script.js` `sendToAPI()` method (line 132):

```javascript
const response = await fetch('/your-api-endpoint', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        // Your request format
    })
});
```

#### Add Authentication
Add auth headers in the `sendToAPI()` method:

```javascript
headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${yourTokenHere}`
},
```

### 7. Task Structure

#### Modify Task Fields
Edit task rendering in `renderTasks()` method (lines 530-620) to add/remove fields:

```javascript
// Add custom field
if (task.customField) {
    const customTag = document.createElement('span');
    customTag.className = 'task-tag';
    customTag.textContent = task.customField;
    meta.appendChild(customTag);
}
```

### 8. Chatbot Behavior

#### Change Offline Mode Responses
Edit `handleOfflineMode()` method (lines 160-180):

```javascript
handleOfflineMode(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('your-keyword')) {
        // Your custom response
        this.addMessage('bot', 'Your custom message');
    }
}
```

#### Modify Conversation Steps
Add new steps in conversation state management:

```javascript
// In your handler
this.conversationState.currentStep = 'your_custom_step';
this.addMessage('bot', 'Your step message');
```

### 9. Animations & Timing

#### Typing Indicator Duration
Edit delays in `sendToAPI()` method (line 150):

```javascript
setTimeout(() => {
    this.hideTypingIndicator();
    this.processAPIResponse(data);
}, 500 + Math.random() * 1000);  // Adjust timing here
```

#### Modal Animation Speed
Edit transition duration in `styles.css` (line 683):

```css
.chatbot-modal {
    transition: transform var(--transition-slow);  /* Change to fast/normal */
}
```

### 10. Storage Keys

If you need to change localStorage keys to avoid conflicts:

Edit in `script.js` (lines 705-715):

```javascript
localStorage.setItem('your-app-messages', JSON.stringify(this.conversationState.messages));
localStorage.setItem('your-app-tasks', JSON.stringify(this.tasks));
```

### 11. Mobile Breakpoints

Edit responsive breakpoints in `styles.css` (lines 900-950):

```css
@media (max-width: 768px) {
    /* Tablet styles */
}

@media (max-width: 480px) {
    /* Mobile styles */
}
```

### 12. Chatbot Modal Width

Change maximum width in `styles.css` (line 677):

```css
.chatbot-modal {
    max-width: 450px;  /* Adjust width */
}
```

### 13. Font Family

Change fonts in `styles.css` (line 48):

```css
body {
    font-family: 'Your Font', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

Don't forget to include the font:

```html
<link href="https://fonts.googleapis.com/css2?family=Your+Font&display=swap" rel="stylesheet">
```

## Environment-Specific Configuration

### Development
- Keep console logs enabled
- Use shorter typing indicator delays
- Enable debug mode flags

### Production
- Remove console.log statements
- Optimize bundle size
- Enable error tracking
- Add analytics

## Best Practices

1. **Test after changes**: Always test the app after modifying configuration
2. **Backup originals**: Keep a copy of original files before customizing
3. **Consistent naming**: Use consistent naming conventions for new features
4. **Document changes**: Comment your custom modifications
5. **Version control**: Commit changes incrementally

## Common Customizations

### 1. Add Avatar Upload
- Add file input to modal
- Store avatar URL in localStorage
- Display in message bubbles

### 2. Add Sound Effects
- Import audio files
- Play on message received
- Add mute toggle

### 3. Add Export Feature
- Add export button
- Convert tasks to JSON/CSV
- Trigger download

### 4. Add Tags/Categories
- Extend task structure
- Add tag input in creation flow
- Add filter UI

### 5. Add Due Date Reminders
- Check dates on load
- Show alerts for overdue tasks
- Add notification system
