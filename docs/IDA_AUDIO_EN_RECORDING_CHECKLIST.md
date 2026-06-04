# IDA — English dialogue audio checklist

Source of truth: `apps/frontend/src/components/awa/AwaDialogue.tsx` (`DIALOGUE_MAP` + `AUDIO_BASENAME_BY_STEP`).

Convention: most steps use `{step}_en.mp3`. Marketing/static pages use custom basenames (see table).

Record **all English sentences for one step in a single MP3**, with short pauses (~0.5s) between lines.

---

## Already on disk (EN)

| File | Step | English script |
|------|------|----------------|
| `landing_en_cut.mp3` | `marketing_intro` | Hi, I'm IDA. · Let's create interior visualizations tailored to you together. |
| `marketing_path_en.mp3` | `marketing_path_selection` | Two paths — quick or full. Pick a card below. |
| `personalization_en.mp3` | `marketing_personalization` | I look at personality, how you live, and what you need — so the proposal is truly yours. |
| `research_project_en.mp3` | `marketing_research` | I'm part of a doctoral research project — want to know more? Click "About the project". |
| `early_en.mp3` | `marketing_early_access` | Try it for free during early access — only for the first 1000 people. |
| `about_project_en.mp3` | `about_project` | More about the study, the author, and the project — it is all described below. |
| `plans_en.mp3` | `subscription_plans` | Compare plans and credits — during early access you can start Basic for free. |
| `contact_en.mp3` | `contact_page` | Have a question or feedback? Fill out the form — I will reply as soon as I can. |
| `landing_en.mp3` | `landing` (legacy / long) | Hi, I'm IDA. · Let's create… · doctoral project… · feedback or bug… |
| `room_furniture_suggestion_en.mp3` | *(no UI lines yet)* | — |

---

## Missing — record these `*_en.mp3`

| # | File to create | Step | English script (full) |
|---|----------------|------|------------------------|
| 1 | `path_selection_en.mp3` | `path_selection` | Choose 'Full Experience' to create a detailed profile of your preferences - it takes about 25 minutes but yields better results. · Choose 'Fast Track' if you want to jump straight to generation. It will only take 3-5 minutes. · Click one of the cards to continue. |
| 2 | `onboarding_en.mp3` | `onboarding` | Before we begin, I need to ask for your formal consent to participate in the study. · Read the information on the screen and check the 'I accept all terms and give consent' checkbox to continue. |
| 3 | `wizard_demographics_en.mp3` | `wizard_demographics` | Fill in your age, gender, and education - this data will help me better tailor the interior to your needs. |
| 4 | `wizard_lifestyle_en.mp3` | `wizard_lifestyle` | Now tell me about your lifestyle. Select who you live with and what your lifestyle is like. · Also choose the most important goals your interior should meet - e.g., relaxation or creativity. |
| 5 | `tinder_en.mp3` | `tinder` | I'll show you a series of interior photos. Swipe right for those you like, left for those you don't. · Act intuitively - this will help me understand your taste. |
| 6 | `wizard_semantic_en.mp3` | `wizard_semantic` | Let's refine the details. You'll see pairs of photos. · Choose the one that suits you better in terms of warmth, brightness, and complexity. |
| 7 | `wizard_sensory_en.mp3` | `wizard_sensory` | Time for sensory preferences. · Browse all categories on the panel to the right and select what suits you. |
| 8 | `inspirations_en.mp3` | `inspirations` | Upload photos of interiors that inspire you. · You can add up to 10 photos - they will help me better understand your taste. |
| 9 | `big_five_en.mp3` | `big_five` | Now we'll complete the Big Five personality test - a scientifically validated model of personality dimensions. · The test examines five areas: openness, conscientiousness, extraversion, agreeableness, and neuroticism. |
| 9b | `big_five_encourage_en.mp3` | `big_five_encourage` | I know it seems like a lot of questions — but trust me, it goes quite smoothly; it only takes a few minutes. · At the end you'll learn your personality type with a full report, and from that we'll design one of your interiors. |
| 10 | `dashboard_en.mp3` | `dashboard` | Here's your user panel - the center of all your data and projects. · You'll find all your survey responses, generated visualizations, inspirations, space profiles, and statistics. · You can browse history, manage projects, and return to any stage of the process. |
| 11 | `style_selection_en.mp3` | `style_selection` | Choose one base style that you like the most. · This will be our starting point for further work on your interior. |
| 12 | `upload_en.mp3` | `upload` | Upload a photo of your interior - preferably clear, showing most of the space. |
| 13 | `room_analysis_en.mp3` | `room_analysis` | I've analyzed your photo. I recognized the room type. · Check if everything is correct and adjust the room type below if needed. |
| 14 | `room_preference_source_en.mp3` | `room_preference_source` | We can use your general profile, or fill out a short survey specific to this room. · Choose the option that suits you better. |
| 15 | `room_prs_current_en.mp3` | `room_prs_current` | Define the current mood of this room on the chart. · Move the dot to the spot that best reflects how you feel in this interior right now. |
| 16 | `room_usage_en.mp3` | `room_usage` | Who will be using this room? · Select the appropriate option so I can consider the needs of all household members. |
| 17 | `room_activities_en.mp3` | `room_activities` | Select all activities you plan to do here. · Click on an activity to specify how often you do it and if the current layout supports it. |
| 18 | `room_pain_points_en.mp3` | `room_pain_points` | What bothers you about the current interior? · Select all elements you want to change or improve, e.g. |
| 19 | `room_prs_target_en.mp3` | `room_prs_target` | How do you want to feel in the new interior? · Move the dot on the chart towards the desired target mood. |
| 20 | `room_summary_en.mp3` | `room_summary` | We have complete information about this room. · Click 'Start Designing' to generate visualizations tailored to your needs. |
| 21 | `generation_en.mp3` | `generation` | Generating visualizations. This may take a moment. · When they are ready, choose one of them that you want to refine further. |
| 22 | `survey_satisfaction_en.mp3` | `survey_satisfaction` | Rate the system usability on a scale of 1-5. · Your opinion about the application is very important to me. |
| 23 | `survey_clarity_en.mp3` | `survey_clarity` | Final questions about the crystallization of your aesthetic taste. · Answer how the process helped you better understand your own preferences. |
| 24 | `thanks_en.mp3` | `thanks` | Thank you for participating in the study! · Your answers have been saved. · If you have any feedback or questions, please contact. |

---

## No English audio needed

| Step | Reason |
|------|--------|
| `room_analysis_ready` | Empty `en` lines (uses `room_analysis` mapping if used) |
| `room_furniture_suggestion` | Empty `en` lines |
| `modification` | Empty `en` lines |

---

## Verify after adding files

```bash
node apps/frontend/scripts/check-dialogue-audio.mjs
```

Place files in: `apps/frontend/public/audio/`
