# Golf Track App: Version 1 Screen Specification

**Document status:** Approved planning baseline  
**Primary platform:** Mobile-first responsive web application  
**Purpose:** Define the screens, navigation, content, actions, validation, and user flows required for Version 1.

## 1. Product goals

Golf Track helps an individual golfer record rounds, review scoring history, and track a calculated handicap without requiring a subscription. Version 1 prioritizes fast score entry, clear at-a-glance information, and dependable round recovery on a phone during play.

The interface should remain simple before authentication and become a focused golf dashboard after sign-in. The playing experience must use large touch targets, high contrast, readable score values, and minimal typing so it remains usable outdoors in bright sunlight.

## 2. Version 1 scope

Version 1 includes:

- Private user accounts and separate data for every user
- A minimal public landing page, registration, sign-in, and sign-out
- An authenticated home dashboard
- A shared course database with user-submitted courses
- Course, tee, and hole information
- One active round per user
- Standard 9-hole and 18-hole round setup
- The ability to start on any hole
- Basic or detailed hole tracking
- Autosaved rounds that can be left and resumed
- Editing of earlier holes during an active round
- Completion of rounds with missing scores after a warning
- Round history, round details, and editing of completed rounds
- Current handicap, handicap history, and round differential information
- A minimal profile and account settings

Version 1 does not include social features, leaderboards, friends, shared scorecards, club or shot tracking, goals, achievements, nearby-course discovery, or location data in the user profile.

## 3. Product rules

1. Each user can access only their own profile, active round, completed rounds, statistics, and handicap history.
2. A user can have only one active round at a time.
3. An active round is a persistent draft. Leaving the scoring screen, losing connectivity, closing the browser, or signing back in must not intentionally discard it.
4. Each hole change is saved locally first and synchronized with the backend when a connection is available.
5. Users can navigate throughout the authenticated app while a round is active.
6. The center navigation action reads **Start** when no round is active and **Resume** when a round is active.
7. Users can edit any previously entered hole during an active round.
8. Users can edit a completed round. Statistics, differentials, and handicap values must be recalculated when relevant data changes.
9. Missing hole scores do not prevent completion, but the user must receive a clear warning.
10. A saved round and a handicap-eligible round are separate concepts. Incomplete or insufficiently rated rounds may remain in history without contributing to handicap.
11. Course Rating and Slope Rating can be omitted when creating a course, but missing values may make a round ineligible for handicap calculation.
12. Historical round records must retain the course and tee information used when the round was played, even if the shared course is later updated.

## 4. Information architecture

### Public screens

- Landing
- Sign In
- Create Account

### Authenticated screens

- Home
- Rounds
  - Round History
  - Round Details
  - Edit Completed Round
- Start or Resume Round
  - Course Selection
  - Round Setup
  - Active Round: Hole Entry
  - Active Round: Scorecard
  - Finish Round Check
  - Round Summary
- Courses
  - Course List and Search
  - Course Details
  - Add Course
  - Edit Owned Course
- Profile
  - Profile Overview
  - Handicap Details
  - Account Settings

## 5. Global navigation and app shell

Authenticated screens use a persistent bottom navigation on mobile:

| Position | Label | Destination |
|---|---|---|
| 1 | Home | Home dashboard |
| 2 | Rounds | Round history |
| 3 | Start or Resume | Round setup or active round |
| 4 | Courses | Course list |
| 5 | Profile | Profile overview |

The center action is visually dominant. It changes to **Resume** and displays an in-progress indicator when an active round exists. The navigation keeps the same position and shape so the user does not need to relearn it during play.

On larger screens, the navigation may become a sidebar or wider navigation bar, but its destinations and active-round behavior must remain consistent.

### Global states

The app shell must support:

- Loading state while authentication and active-round status are checked
- Online, saving, saved, and offline/pending-sync indicators during an active round
- A nonblocking error state with a retry option when synchronization fails
- An active-round banner on Home when a round is in progress
- Session-expired handling that returns the user to sign-in without deleting locally retained active-round data

## 6. Public screens

### 6.1 Landing

**Purpose:** Briefly explain the product and direct visitors to authentication.

**Content:**

- Product name and simple logo or wordmark
- One-sentence value statement
- Primary **Create Account** action
- Secondary **Sign In** action

**Behavior:** Authenticated users who visit the public root route should be redirected to Home. Version 1 does not require pricing, testimonials, feature comparisons, or a large marketing page.

### 6.2 Sign In

**Fields:**

- Email
- Password

**Actions:**

- Primary: **Sign In**
- Secondary: **Create Account**
- Optional if supported by the authentication service: **Forgot Password**

**Validation and errors:**

- Validate required fields and email format inline.
- Use one general error for invalid credentials so the app does not reveal whether an email is registered.
- Disable repeated submission while the request is processing.

**Success destination:** Home, unless a protected route or active round should be resumed from an earlier session.

### 6.3 Create Account

**Fields:**

- Name
- Email
- Password
- Confirm password, if required by the selected authentication approach
- Starting Handicap, optional

**Starting Handicap helper text:** This value is a starting reference and is not the same as a handicap calculated from recorded qualifying rounds.

**Actions:**

- Primary: **Create Account**
- Secondary: **Sign In**

**Validation:**

- Name, email, and password are required.
- Email must be valid and unique.
- Password must meet the authentication provider's requirements.
- Confirmation must match when present.
- Starting Handicap must be within the handicap range supported by the implemented calculation rules.

**Success destination:** Home. No additional onboarding is required in Version 1.

## 7. Home

### 7.1 Home dashboard

**Purpose:** Answer “How am I playing?” and provide the clearest next action.

**Content priority:**

1. Greeting using the player's name
2. Active-round card, when applicable
3. Current handicap status
4. At-a-glance scoring statistics
5. Handicap trend
6. Recent rounds

**At-a-glance statistics:**

- Current calculated handicap, or starting/not-established state
- Average score
- Best score
- Total completed rounds
- Last five completed rounds average

Only statistics supported by available data are shown. Detailed stats such as putts, fairways, and GIR remain on round detail screens in Version 1.

**Active-round card:**

- Course name
- Tee name
- Round length
- Progress, such as “8 of 18 holes scored”
- Last save or pending-sync state when useful
- Primary **Resume Round** action
- Secondary **Abandon Round** action behind a confirmation

**Recent rounds:** Show the latest three to five rounds with date, course, total score when available, and score relative to par when calculable. Selecting a row opens Round Details. A **View All Rounds** action opens Round History.

**Handicap trend:** A compact chart or summary showing recent calculated handicap changes. Selecting it opens Handicap Details.

**Empty state:** A new user sees their starting handicap or “Not established,” explanatory text, and a primary **Start Your First Round** action. Statistics that require rounds should not display misleading zero values.

## 8. Start and active-round screens

### 8.1 Course Selection

**Purpose:** Select the course for a new round.

**Content:**

- Search input
- Recently played courses, when available
- Search results with course name and broad location if present in the course record
- **Add Missing Course** action

**Actions:** Selecting a course continues to Round Setup. Adding a course opens Add Course and returns to the new course's details or round setup after a successful save.

**States:**

- No recent courses: show search and an add-course prompt.
- No search results: show a clear no-results message and **Add This Course** action.
- Course with incomplete tee data: allow viewing, but prevent starting until the minimum round data exists.

**Active-round guard:** If an active round already exists, opening Start must show the active round with **Resume Round** and **Abandon and Start New**. Starting a second simultaneous round is not allowed.

### 8.2 Round Setup

**Purpose:** Configure a round before creating the active draft.

**Displayed course summary:**

- Course name
- Selected tee information
- Par, yardage, Course Rating, and Slope Rating when available

**Fields:**

- Tee box
- Round length: 9 or 18 holes
- Starting hole: any valid hole for the selected course
- Tracking mode: Basic or Detailed

**Defaults:**

- Remember the most recently used tee for this user at this course when possible.
- Default to 18 holes.
- Default the starting hole to Hole 1.
- Remember the user's most recently selected tracking mode as a convenience.

**Tracking modes:**

- **Basic:** Score is visible by default; details remain available for any hole.
- **Detailed:** Score, putts, fairway, GIR, penalties, and notes are visible.

Tracking mode changes the interface default, not the data model, and may be changed during the round.

**Actions:**

- Primary: **Begin Round**
- Secondary: return to course selection

**Validation:** Tee, round length, and starting hole are required. If rating data is missing, warn that the round may not be eligible for handicap calculation but allow the round to begin.

### 8.3 Active Round: Hole Entry

**Purpose:** Make entering a hole score fast and reliable with one hand.

**Persistent header:**

- Course name
- Tee name
- Current aggregate score when calculable
- Current hole number and progress
- Save/sync status
- Scorecard access
- Overflow action containing **Abandon Round**

**Hole information:**

- Hole number
- Par
- Yardage for the selected tee, when available
- Hole/stroke index, when available

**Basic entry:**

- Large score value
- Large decrement and increment controls
- Sensible initial value, normally the hole's par, but the hole remains unscored until the user changes or confirms it
- Previous and next hole actions
- Expandable **Add Details** section

**Detailed entry:**

- Score
- Putts using large preset buttons, with support for values beyond the common presets
- Fairway result: Hit, Left, or Right
- GIR: Yes or No
- Penalty strokes using tap controls
- Optional notes

Fairway controls are hidden or marked not applicable on par 3 holes. Detailed fields are optional and an unanswered field means “not recorded,” not zero or no.

**Navigation and editing:**

- The user can move backward or forward to any hole in the configured round order.
- Starting on a hole other than Hole 1 changes the play order. For example, an 18-hole round beginning on Hole 10 proceeds through 18 and then 1 through 9.
- The scorecard provides direct navigation to any hole.
- Leaving through bottom navigation retains the active draft.

**Saving:** Each change updates the interface immediately, writes to local storage, and attempts backend synchronization. Do not block normal scoring while a save is pending. Show compact statuses such as **Saving**, **Saved**, or **Offline: saved on this device**.

**Validation:**

- Score, putts, and penalties must be nonnegative whole numbers within reasonable application limits.
- Detailed statistics may be partially completed.
- A hole may remain entirely unscored.

### 8.4 Active Round: Scorecard

**Purpose:** Review the full round and jump to holes needing correction.

**Content:**

- Hole numbers in configured play order
- Par for each hole
- Entered score or an obvious blank state
- Front nine, back nine, and total values when calculable
- Score relative to par when calculable
- Visual indication of unscored holes

**Actions:**

- Select any hole to edit it
- Return to current hole
- Primary **Finish Round** action

The scorecard must remain readable on a phone. It may use separate front-nine and back-nine sections rather than forcing a wide 18-column table.

### 8.5 Finish Round Check

**Purpose:** Validate the draft without preventing the user from preserving an incomplete round.

**Complete round behavior:** If every expected hole has a score, continue directly to Round Summary or show a simple completion confirmation.

**Missing-score warning:**

- State how many holes are missing scores.
- List the missing hole numbers.
- Explain that the round can still be saved but may not produce complete statistics or qualify for handicap calculation.
- Primary or safe action: **Review Missing Holes**
- Secondary explicit action: **Complete Anyway**

Completing an incomplete round sets it to Completed while independently marking the correct handicap eligibility.

### 8.6 Round Summary

**Purpose:** Confirm the newly completed round and show its useful results.

**Content when supported:**

- Course and tee
- Date
- Total score
- Score relative to par
- Front and back totals
- Fairways hit count and percentage
- GIR count and percentage
- Total putts
- Total penalties
- Round differential
- Handicap eligibility status and reason when ineligible

Stats that were not recorded should be omitted or labeled **Not tracked**, never shown as zero.

**Actions:**

- Primary: **View Round Details**
- Secondary: **Return Home**

Saving the completion clears the active-round state, updates dashboard statistics, and recalculates handicap when appropriate.

### 8.7 Abandon Round confirmation

Abandoning is available from the active-round banner and active-round overflow menu. The confirmation identifies the course and explains that the draft will no longer be resumable. The safe action is **Keep Round**. The destructive action is **Abandon Round**. Abandoned rounds do not appear in normal Round History in Version 1.

## 9. Round history and details

### 9.1 Round History

**Purpose:** Provide a chronological record of completed rounds.

**Round list item:**

- Date
- Course name
- Tee name when space allows
- Total score when available
- Score relative to par when calculable
- Incomplete indicator when holes are missing
- Handicap-counting indicator when useful

Rounds are grouped by year and sorted newest first. Selecting a round opens Round Details.

**Version 1 controls:** A simple course search or filter may be included if straightforward, but advanced filtering is not required.

**Empty state:** Explain that completed rounds will appear here and provide **Start a Round**.

### 9.2 Round Details

**Purpose:** Show the complete stored record of one round.

**Content:**

- Course, tee, and date
- Round status and completion state
- Total score and score relative to par
- Front and back totals
- Hole-by-hole scorecard
- Detailed totals and percentages for recorded putts, fairways, GIR, and penalties
- Hole notes where present
- Differential and handicap eligibility
- Clear reason when the round is not handicap eligible

**Actions:**

- **Edit Round**
- **Delete Round** in an overflow or danger area
- Return to Round History

### 9.3 Edit Completed Round

**Purpose:** Correct scores or details after completion.

The editing interface reuses the hole-entry and scorecard patterns but clearly displays **Editing Completed Round**. The user can edit any stored hole data and round-level selections that can safely change after completion.

**Actions:**

- Primary: **Save Changes**
- Secondary: **Cancel** and discard unsaved edits

**Recalculation notice:** If edits can affect total score, statistics, differential, or handicap, state that these values will be recalculated after saving.

**Validation:** Apply the same field validation as active entry. Missing scores remain allowed, with the same eligibility implications.

### 9.4 Delete Round confirmation

The confirmation identifies the round and explains that deleting it will recalculate dashboard statistics and handicap history. The safe action is **Cancel**. The destructive action is **Delete Round**. This action should require an explicit confirmation and should not be triggered by a single list-row gesture.

## 10. Courses

### 10.1 Course List and Search

**Purpose:** Browse, find, and add courses independently of starting a round.

**Content:**

- Search input
- Recently played courses
- Search results or available course list
- **Add Course** action

**Course list item:** Course name, broad course location if stored with the course, number of holes, and total par when available.

**Empty and no-result states:** Encourage the user to add a missing course without implying that the database is complete.

### 10.2 Course Details

**Purpose:** Review course, tee, and hole data before using it in a round.

**Content:**

- Course name
- General course location, if part of the course record
- Number of holes
- Tee table with tee name, total yardage, par, Course Rating, and Slope Rating when available
- Hole table with hole number, par, yardage by tee, and stroke index when available
- Data completeness notice where necessary

**Actions:**

- Primary: **Start Round Here**
- **Edit Course** only when the current user owns or is permitted to maintain the submitted course record

### 10.3 Add Course

**Purpose:** Allow a user to add a playable course missing from the shared database.

**Course fields:**

- Course name, required
- General course location, optional; this belongs to the course, not the user profile
- Number of holes, required: 9 or 18

**Tee fields for each tee set:**

- Tee name, required
- Course Rating, optional
- Slope Rating, optional

**Hole fields:**

- Hole number, generated from the course length
- Par, required
- Yardage for each tee, required for a complete tee set
- Stroke index, optional

**Interaction requirements:**

- Support adding multiple tee sets.
- Use a mobile-friendly sequential editor or compact grid that does not require horizontal precision.
- Preserve partially entered form data during ordinary navigation when practical.

**Validation:**

- Course name and course length are required.
- At least one named tee set is required before the course can be used to start a round.
- Each playable hole requires a par.
- Rating must be a valid decimal when entered.
- Slope must be within the supported rating range when entered.
- Warn about likely duplicate courses based on name and course location, but do not silently merge records.

**Success:** Save the course, show Course Details, and make it immediately selectable for a round. If the form began from Course Selection, provide a direct continuation into Round Setup.

### 10.4 Edit Owned Course

The screen reuses Add Course fields and validation. Existing historical rounds must not be silently rewritten when the shared course record changes. If a course is already referenced by rounds, archive or version course data rather than hard-deleting it.

## 11. Profile and handicap

### 11.1 Profile Overview

**Purpose:** Show basic account and golf identity information without collecting unused personal data.

**Content:**

- Name
- Email
- Current calculated handicap, starting handicap, or not-established state
- Total rounds played
- Member since date

**Actions:**

- **View Handicap Details**
- **Account Settings**
- **Sign Out**

Location, gender, height, weight, birthdate, and account-level preferred tee are excluded from Version 1.

### 11.2 Handicap Details

**Purpose:** Make handicap status and calculation inputs understandable.

**Content:**

- Current calculated handicap when established
- Starting handicap when supplied and still relevant
- “Not enough qualifying rounds” state when applicable
- Handicap history trend
- Qualifying rounds and their differentials
- Identification of the rounds currently contributing to the calculation
- Link from each round to Round Details

**Behavior:** Editing or deleting a qualifying round triggers recalculation. The display must distinguish an optional user-entered starting handicap from an app-calculated handicap.

**Disclaimer:** Version 1 should describe its calculation as official WHS-compliant only if the implemented rules, licensing, data requirements, and regional requirements have been verified. Until then, label it accurately as an estimated or WHS-style handicap where appropriate.

### 11.3 Account Settings

**Editable fields and actions:**

- Name
- Email, subject to reauthentication or verification requirements
- Password change or password-management link
- Starting handicap while no calculated handicap is established, if product rules permit editing it
- Sign out
- Delete account, if required by the authentication/data policy

Do not include settings with no Version 1 behavior. Display preferences can be added later when they have a real effect.

## 12. Primary user flows

### 12.1 Register and begin using the app

Landing → Create Account → Enter required account information and optional starting handicap → Home empty state → Start Round

### 12.2 Complete a normal round

Home → Start → Select Course → Select Tee and round settings → Begin Round → Enter holes → Review Scorecard → Finish Round → Round Summary → Home or Round Details

### 12.3 Leave and resume a round

Active Round → Select another bottom navigation destination → Use the app → Tap Resume or the Home active-round card → Return to the last active or selected hole

### 12.4 Recover after browser closure or lost connectivity

Enter hole data → Save locally → Attempt backend sync → Browser closes or signal is lost → Reopen and authenticate if needed → Detect local/backend active draft → Reconcile saved data → Resume Round → Synchronize when online

If local and backend versions conflict, preserve data and require a deliberate resolution; never silently discard the newer hole entries.

### 12.5 Finish with missing holes

Active Round → Finish Round → See missing-hole warning → Review and fill holes, or Complete Anyway → Save completed but potentially ineligible round → Round Summary

### 12.6 Edit a completed round

Round History → Round Details → Edit Round → Change hole data → Save Changes → Recalculate round totals, dashboard stats, differential, and handicap as applicable → Updated Round Details

### 12.7 Add a missing course while starting

Start → Search Course → No result → Add Course → Enter course, tee, and hole information → Save → Round Setup with new course selected

## 13. Visual and accessibility requirements

Version 1 uses a sunlight-friendly light theme as the primary playing experience.

- White or warm off-white backgrounds
- Near-black primary text
- Deep golf green primary accent
- Strong selected and focus states that do not rely only on color
- Subtle borders in place of low-contrast shadows
- Large score numerals and bold key values
- Minimum 44 by 44 CSS pixel touch targets, with larger controls for scoring
- Readable body text without thin or low-opacity styles
- Clear labels for icons
- Visible keyboard focus
- Semantic form labels and error associations
- Screen-reader announcements for save state and validation where useful
- Support for browser text scaling without blocking critical actions
- Avoid important interactions that depend exclusively on hover, swipe, or precise drag gestures

Dark mode may be added later. It is not required for Version 1.

## 14. Shared loading, empty, error, and destructive states

Every data-driven screen must define:

- A stable loading skeleton or progress state
- An empty state that explains why no data exists and provides a useful next action
- A recoverable error state with retry
- A permissions/not-found state that does not leak another user's private data

Destructive actions must identify the affected item, explain the consequence, and use an explicit confirmation. The safe/cancel action receives visual priority unless there is a strong reason otherwise.

## 15. Suggested route map

Exact route syntax can change with the selected framework architecture, but the following map expresses the intended destinations:

| Route | Screen | Access |
|---|---|---|
| `/` | Landing or authenticated redirect | Public |
| `/sign-in` | Sign In | Public |
| `/register` | Create Account | Public |
| `/app` | Home | Private |
| `/app/rounds` | Round History | Private |
| `/app/rounds/:roundId` | Round Details | Private |
| `/app/rounds/:roundId/edit` | Edit Completed Round | Private |
| `/app/round/start` | Course Selection | Private |
| `/app/round/setup/:courseId` | Round Setup | Private |
| `/app/round/active` | Active Round | Private |
| `/app/round/active/scorecard` | Active Scorecard | Private |
| `/app/round/summary/:roundId` | Round Summary | Private |
| `/app/courses` | Course List | Private |
| `/app/courses/new` | Add Course | Private |
| `/app/courses/:courseId` | Course Details | Private |
| `/app/courses/:courseId/edit` | Edit Owned Course | Private |
| `/app/profile` | Profile Overview | Private |
| `/app/profile/handicap` | Handicap Details | Private |
| `/app/profile/settings` | Account Settings | Private |

The active-round route should resolve the user's current draft rather than exposing a round identifier that could be replaced with another user's ID.

## 16. Acceptance criteria for the V1 screen layer

The screen implementation is ready for Version 1 when:

1. A new user can register, sign in, and reach a useful Home empty state.
2. A user can find or add a course and configure a 9-hole or 18-hole round beginning on any valid hole.
3. A user can enter score-only data quickly and optionally add all six detailed fields.
4. A user can leave, close, reconnect, and resume one active round without expected data loss.
5. A user can review and edit any hole before completing the round.
6. A user can complete an incomplete round only after seeing the missing-hole warning.
7. A completed round appears in history and displays only the statistics actually recorded.
8. A user can edit or delete a completed round and see dependent statistics recalculated.
9. Home and Profile distinguish starting handicap, calculated handicap, and not-established states.
10. Course records with missing rating data communicate the handicap limitation without preventing ordinary score tracking.
11. Every primary workflow is usable on a phone in high-contrast light mode with accessible touch targets.
12. Protected data cannot be viewed or edited by another user through navigation or route manipulation.

## 17. Deferred decisions for architecture and data modeling

The following do not block the screen specification, but must be decided during schema and architecture planning:

- Authentication provider and password-recovery implementation
- Exact handicap formula, eligibility rules, update cadence, and terminology
- Conflict-resolution strategy for offline edits
- Ownership, moderation, duplicate handling, and correction workflow for shared courses
- Whether archived abandoned rounds are retained internally
- Exact database strategy for snapshotting historical course and tee data
- Backend recalculation jobs versus synchronous recalculation
- Progressive Web App installation and background-sync support

These decisions should preserve the product rules and screen behaviors defined above.

