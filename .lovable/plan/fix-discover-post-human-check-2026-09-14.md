# Fix Discover post human check

## What will change
- Display the visible human-verification checkbox inside the Discover post window before the Post button.
- Keep preview testing usable when the verification service cannot run on the preview hostname.
- Verify a post can pass the check without the blocking message.
- Run the security check and publish the fix to onlookerlive.com.

## Technical details
- Render the existing shared `HumanCheck` widget in the Discover post form; it is currently checked during submission but missing from the visible form.
- Validate the posting flow in the browser, then publish the frontend update.
