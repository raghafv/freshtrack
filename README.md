# FreshTrack: Smart Pantry Manager

You are a senior software engineer, product designer and startup CTO.

Build a COMPLETE production-quality Progressive Web App (PWA) called FreshTrack.

IMPORTANT:

This is NOT a demo.

This is NOT a prototype.

This must be a fully functional MVP.

Do NOT generate placeholder pages.

Do NOT generate fake buttons.

Do NOT leave TODO comments.

Do NOT generate mock screens.

Every page must work.

======================================================

PROJECT

======================================================

FreshTrack is an AI-powered smart pantry platform designed for urban households that purchase groceries in bulk.

The goal is to reduce food waste by helping users remember what groceries they already own, when those groceries expire, and what recipes they can cook before food spoils.

In the future there will be a magnetic AI camera device attached to the refrigerator.

For this MVP the user's PHONE CAMERA performs the same task.

Both should use the exact same pantry database.

======================================================

TECH STACK

======================================================

React

TypeScript

Vite

Firebase Authentication

Firestore

Firebase Storage

PWA

Material Design 3

Responsive Design

======================================================

DESIGN

======================================================

Preserve the existing FreshTrack premium UI.

Do NOT redesign.

Use modern startup aesthetics.

Rounded cards.

Glassmorphism where appropriate.

Material 3.

Beautiful animations.

Smooth transitions.

Premium typography.

Dark Mode.

Light Mode.

Professional dashboard.

======================================================

AUTHENTICATION

======================================================

Google Sign In.

If unavailable, automatically fall back to email/password authentication.

======================================================

BOTTOM NAVIGATION

======================================================

Dashboard

Pantry

Scanner

Recipes

Shopping List

Notifications

Profile

======================================================

PANTRY

======================================================

Initially empty.

Remove every hardcoded product.

Users must populate the pantry themselves.

Support

Search

Filter

Sort

Edit

Delete

Bulk Delete

Each pantry item contains

Name

Brand

Category

Quantity

Unit

Purchase Date

Expiry Date

Storage

Image

Status

Fresh

Use Soon

Expired

======================================================

ADD ITEM

======================================================

Support

Manual Add

Barcode Add

Camera Add

Device Add (future simulation)

Manual Add asks for

Item

Brand

Purchase Date

Quantity

Unit

Storage

Automatically calculate expiry.

======================================================

STORAGE TYPES

======================================================

Fridge

Freezer

Pantry

======================================================

UNITS

======================================================

kg

g

L

mL

pcs

======================================================

DASHBOARD

======================================================

Generate every statistic dynamically.

Display

Pantry Health Score

Total Items

Fresh

Use Soon

Expired

Added Today

Estimated Savings

Waste Prevented

Recent Activity

Last Scan

Device Status

======================================================

RECENT ACTIVITY

======================================================

Maintain chronological activity.

Added Item

Deleted Item

Edited Item

Scan Completed

======================================================

SHOPPING LIST

======================================================

Initially empty.

Allow manual additions.

Support

Categories

Checkboxes

Delete

Automatic generation later.

======================================================

RECIPES

======================================================

Initially empty.

Design page ready for future AI recipe recommendations.

======================================================

PROFILE

======================================================

Profile

Statistics

Dark Mode

Settings

Logout

======================================================

SETTINGS

======================================================

Theme

Notifications

Storage Preferences

Units

Delete Account

======================================================

NOTIFICATIONS

======================================================

Create notification infrastructure.

Display notification history.

Allow enabling/disabling reminders.

======================================================

DATABASE

======================================================

Create Firestore collections

users

pantry_items

notifications

shopping_lists

scan_history

settings

Each pantry item contains

id

userId

name

brand

category

quantity

unit

purchaseDate

expiryDate

storage

image

status

createdAt

updatedAt

======================================================

PWA

======================================================

The app must be installable on Android.

Responsive on phone.

Fast.

Offline capable where possible.

======================================================

QUALITY

======================================================

Use reusable React components.

Use clean architecture.

No placeholder inventory.

No fake statistics.

No lorem ipsum.

No unfinished pages.

Every navigation link must work.

Every screen must be polished.

Generate the ENTIRE application before stopping.

If the response is too long, continue automatically until every page, every route, every component and every Firestore integration is completed.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://freshtrackmvp1.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0c0892ab-045f-4ea6-84d9-499a9811a433).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
