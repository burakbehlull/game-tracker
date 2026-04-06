# Social Features Test Checklist

## Friends and Requests
- Register/login with UserA and UserB.
- UserA sends friend request to UserB from Friends page.
- UserB sees incoming request without refresh (or after short refresh).
- UserB accepts request; both users see each other in friends list.
- UserA removes UserB; both users are removed from list.

## Presence
- UserA and UserB are friends.
- UserA opens app and logs in, UserB sees UserA as Online.
- UserA starts a supported game, UserB sees Playing `<gameName>`.
- UserA closes game, status returns to Online.
- UserA disconnects (close tab/app), status becomes Offline.

## Chat (DM + Group)
- From Chat page, create DM from friend list.
- Send message from UserA, confirm UserB receives it in same conversation.
- Create group with at least 3 users (owner + 2 friends).
- Send message in group and verify all online members receive event.
- Reload conversation and confirm message history persists.

## Authorization and Guards
- Try calling friends/chat routes with invalid token; verify 401.
- Try creating DM with non-friend user; verify 403.
- Try reading another conversation's messages as unauthorized user; verify 404/denied.

## Reconnect
- Keep chat open, disconnect network temporarily, reconnect.
- Verify socket reconnects and new messages continue arriving.
