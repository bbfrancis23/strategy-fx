import { useContext, useState } from "react"
import Head from 'next/head'
import { Box, Grid, Typography, Button, Chip, Stack } from "@mui/material"
import GitHubIcon from "@mui/icons-material/GitHub"
import LoginIcon from "@mui/icons-material/Login"
import ViewKanbanIcon from "@mui/icons-material/ViewKanban"
import DragIndicatorIcon from "@mui/icons-material/DragIndicator"
import ChecklistIcon from "@mui/icons-material/Checklist"
import ForumIcon from "@mui/icons-material/Forum"
import ThumbUpIcon from "@mui/icons-material/ThumbUp"
import GroupIcon from "@mui/icons-material/Group"
import PaletteIcon from "@mui/icons-material/Palette"
import LockIcon from "@mui/icons-material/Lock"

import { AppFooter, AppContext, AppDialogs, DialogActions } from "@/react/app"
import { FxThemeContext } from "@/fx/theme"
import { SCREENSHOT_RATIO, CoverImg, GalleryImage, GALLERY, GalleryCard, Lightbox }
  from "./HomePageGallery"

const GITHUB_URL = "https://github.com/bbfrancis23/aqua-dogs"

const DESCRIPTION = "Strategy Fx is a full-stack board and project management app, built solo "
  + "end-to-end with Next.js, TypeScript, MongoDB and Material UI as a portfolio project."
const KEYWORDS = "Portfolio Project, Kanban Board, Next.js, TypeScript, React, "
  + "MongoDB, Mongoose, Material UI, MUI, NextAuth, Full Stack Developer, Software Engineer, "
  + "Web Application, Drag and Drop, Project Management"

export const WEBSITE_PROJECT_ID: string = '64b6bc0a1b836981ba0c4cc5'

interface Feature { icon: JSX.Element; title: string; body: string }

const FEATURES: Feature[] = [
  { icon: <ViewKanbanIcon fontSize={'large'} color={'primary'} />, title: "Boards & Columns",
    body: "Create boards, columns and cards with switchable color and background themes." },
  { icon: <DragIndicatorIcon fontSize={'large'} color={'primary'} />, title: "Drag & Drop",
    body: "Reorder cards and columns in place, built on react-beautiful-dnd." },
  { icon: <ChecklistIcon fontSize={'large'} color={'primary'} />, title: "Checklists",
    body: "Break a card down into checklists with individually tracked items." },
  { icon: <ForumIcon fontSize={'large'} color={'primary'} />, title: "Comments",
    body: "Discuss cards with threaded text comments and syntax-highlighted code snippets." },
  { icon: <ThumbUpIcon fontSize={'large'} color={'primary'} />, title: "Voting & Favorites",
    body: "Members can vote on and favorite cards to surface what matters most." },
  { icon: <GroupIcon fontSize={'large'} color={'primary'} />, title: "Projects & Members",
    body: "Group boards into projects and manage who has access to them." },
  { icon: <LockIcon fontSize={'large'} color={'primary'} />, title: "Authentication",
    body: "Email + verification-code sign up alongside Google OAuth, via NextAuth." },
  { icon: <PaletteIcon fontSize={'large'} color={'primary'} />, title: "Theming",
    body: "Eight selectable color palettes, in both light and dark mode." },
]

const STACK = [
  "Next.js",
  "TypeScript",
  "React",
  "MongoDB",
  "Mongoose",
  "Material UI",
  "NextAuth",
  "Node.js",
]

const FeatureCard = ({icon, title, body}: Feature) => (
  <Grid item xs={12} sm={6} md={3}>
    <Stack spacing={1} sx={{ height: '100%' }}>
      {icon}
      <Typography variant={'h3'} sx={{ fontSize: '18px', fontWeight: 600 }}>{title}</Typography>
      <Typography variant={'body2'} color={'text.secondary'}>{body}</Typography>
    </Stack>
  </Grid>
)

// secondary.main stays a light tint in both light and dark mode (see getPaletteOptions in
// fx/theme/index.ts), so text on it must stay dark too instead of following the
// mode-flipping text.* tokens.
const TINT_TEXT_PRIMARY = 'rgba(0, 0, 0, 0.87)'
const TINT_TEXT_SECONDARY = 'rgba(0, 0, 0, 0.6)'
const ChipSx = { color: TINT_TEXT_PRIMARY, borderColor: 'rgba(0, 0, 0, 0.23)' }

const HeroTitleSx = { fontSize: {xs: '2.5rem', sm: '3.5rem'}, fontWeight: 700 }
const HeroSubtitleSx = { fontSize: {xs: '1.1rem', sm: '1.35rem'}, fontWeight: 400,
  color: TINT_TEXT_SECONDARY, mt: 2 }

const HeroCollageSx = { mt: 6, mb: 2, mx: 'auto', maxWidth: '820px', position: 'relative',
  aspectRatio: '16 / 11' }

interface CollageCardPlacement {
  top: string
  left: string
  width: string
  rotate: number
  z: number
}

const collageCardSx = ({top, left, width, rotate, z}: CollageCardPlacement) => ({
  position: 'absolute', top, left, width, aspectRatio: SCREENSHOT_RATIO,
  transform: `rotate(${rotate}deg)`, zIndex: z, bgcolor: 'background.paper',
  border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden',
  boxShadow: z === 3 ? 8 : 3,
})

const HeroCollage = () => (
  <Box sx={HeroCollageSx}>
    <Box sx={collageCardSx({top: '0%', left: '2%', width: '62%', rotate: -6, z: 1})}>
      <CoverImg src={'/images/marketing/Strategy-Board.png'}
        sizes={'(max-width: 820px) 62vw, 500px'}
        alt={'A React board with a Custom Hook card dialog open, showing example hook code'} />
    </Box>
    <Box sx={collageCardSx({top: '24%', left: '36%', width: '62%', rotate: 5, z: 2})}>
      <CoverImg src={'/images/marketing/Workout-Board.png'}
        sizes={'(max-width: 820px) 62vw, 500px'}
        alt={'A workout board tracking isolation exercises by muscle group'} />
    </Box>
    <Box sx={collageCardSx({top: '12%', left: '19%', width: '64%', rotate: 0, z: 3})}>
      <CoverImg src={'/images/marketing/Standards-Item.png'} priority
        sizes={'(max-width: 820px) 64vw, 520px'}
        alt={'A Strategies board with a MUI Theme Colors card dialog open, showing '
          + 'theme palette code'} />
    </Box>
  </Box>
)

const Hero = ({onSignIn}: {onSignIn: () => void}) => (
  <Box sx={{ py: {xs: 6, sm: 10}, textAlign: 'center', bgcolor: 'secondary.main',
    color: TINT_TEXT_PRIMARY, borderBottom: '1px solid', borderColor: 'divider' }}>
    <Box sx={{ maxWidth: '760px', mx: 'auto', px: 3 }}>
      <Typography variant={'overline'} sx={{ color: TINT_TEXT_SECONDARY }}>
        Portfolio Project
      </Typography>
      <Typography variant={'h1'} sx={HeroTitleSx}>Strategy Fx</Typography>
      <Typography variant={'h2'} sx={HeroSubtitleSx}>
        A board and project management app, built solo from the database up
        &mdash; a case study in full-stack product engineering, not just a UI exercise.
      </Typography>
      <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} justifyContent={'center'}
        sx={{ mt: 4 }}>
        <Button variant={'contained'} size={'large'} startIcon={<GitHubIcon />}
          href={GITHUB_URL} target={'_blank'} rel={'noopener noreferrer'}>
          View Source on GitHub
        </Button>
        <Button variant={'outlined'} size={'large'} startIcon={<LoginIcon />} onClick={onSignIn}>
          Sign In & Try It
        </Button>
      </Stack>
    </Box>
    <HeroCollage />
  </Box>
)

const Page = () => {

  const {fxTheme: fx} = useContext(FxThemeContext)
  const {dialogActions} = useContext(AppContext)
  const [openImage, setOpenImage] = useState<GalleryImage | null>(null)

  const openAuthDialog = () => dialogActions({type: DialogActions.Open, dialog: AppDialogs.Auth})

  return (
    <>
      <Head>
        <title>Strategy Fx - A Board & Project Management App, Built as a Portfolio Project</title>
        <meta name="description" content={DESCRIPTION} />
        <meta name="keywords" content={KEYWORDS} />
      </Head>

      <Hero onSignIn={openAuthDialog} />

      {/* Features */}
      <Box sx={{ p: fx.theme.defaultPadding, py: {xs: 5, sm: 7} }}>
        <Typography variant={'h2'} sx={{ fontSize: '1.75rem', fontWeight: 600,
          textAlign: 'center', mb: 4 }}>
          What It Does
        </Typography>
        <Grid container spacing={4} sx={{ maxWidth: '1100px', mx: 'auto' }}>
          { FEATURES.map((f) => <FeatureCard key={f.title} {...f} />) }
        </Grid>
      </Box>

      {/* Stack */}
      <Box sx={{ py: {xs: 5, sm: 7}, bgcolor: 'secondary.main', color: TINT_TEXT_PRIMARY,
        borderTop: '1px solid', borderBottom: '1px solid', borderColor: 'divider',
        textAlign: 'center' }}>
        <Typography variant={'h2'} sx={{ fontSize: '1.75rem', fontWeight: 600, mb: 3 }}>
          Built With
        </Typography>
        <Stack direction={'row'} spacing={1} justifyContent={'center'} flexWrap={'wrap'}
          sx={{ maxWidth: '700px', mx: 'auto', gap: 1 }}>
          { STACK.map((s) => (
            <Chip key={s} label={s} variant={'outlined'} sx={ChipSx} />
          )) }
        </Stack>
      </Box>

      {/* Gallery */}
      <Box sx={{ p: fx.theme.defaultPadding, py: {xs: 5, sm: 7} }}>
        <Typography variant={'h2'} sx={{ fontSize: '1.75rem', fontWeight: 600,
          textAlign: 'center', mb: 4 }}>
          See It In Action
        </Typography>
        <Grid container spacing={4} sx={{ maxWidth: '1100px', mx: 'auto' }}>
          { GALLERY.map((g) => (
            <GalleryCard key={g.src} {...g} onOpen={() => setOpenImage(g)} />
          )) }
        </Grid>
      </Box>
      <Lightbox image={openImage} onClose={() => setOpenImage(null)} />

      {/* About */}
      <Box sx={{ p: fx.theme.defaultPadding, py: {xs: 5, sm: 7}, maxWidth: '760px', mx: 'auto' }}>
        <Typography variant={'h2'} sx={{ fontSize: '1.75rem', fontWeight: 600, mb: 2 }}>
          About This Build
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Strategy Fx was designed and built by Brian Francis to work through the hard parts of a
          real product end-to-end: modeling nested boards/columns/cards/checklists in MongoDB,
          building a custom email verification-code auth flow alongside Google OAuth, wiring up
          drag-and-drop state that stays in sync with the server, and theming a Material UI app
          across eight palettes in light and dark mode.
        </Typography>
      </Box>

      <AppFooter />
    </>
  )
}

export default Page

// QA: Brian Francis - 10-20-2023
