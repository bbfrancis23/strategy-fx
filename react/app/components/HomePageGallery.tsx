import Image from "next/image"
import { Box, Grid, Typography, ButtonBase, Dialog, DialogContent, IconButton } from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"

export const SCREENSHOT_RATIO = '1917 / 905'

interface CoverImgProps { src: string; alt: string; sizes: string; priority?: boolean }

export const CoverImg = ({src, alt, sizes, priority}: CoverImgProps) => (
  <Image src={src} alt={alt} fill sizes={sizes} priority={priority}
    style={{ objectFit: 'cover' }} />
)

export interface GalleryImage { src: string; alt: string; caption: string }

export const GALLERY: GalleryImage[] = [
  { src: '/images/marketing/Strategy-Board.png',
    alt: 'A React board with a Custom Hook card dialog open, showing example hook code',
    caption: 'Card detail with code snippets' },
  { src: '/images/marketing/Standards-Item.png',
    alt: 'A Strategies board with a MUI Theme Colors card dialog open, showing theme '
      + 'palette code',
    caption: 'Switchable board themes' },
  { src: '/images/marketing/Workout-Board.png',
    alt: 'A workout board tracking isolation exercises by muscle group',
    caption: 'Flexible enough for a workout tracker' },
  { src: '/images/marketing/Best-Practice.png',
    alt: 'A React documentation page explaining the useReducer hook',
    caption: 'In-depth documentation pages' },
  { src: '/images/marketing/Member-Page.png',
    alt: 'A member dashboard listing their projects',
    caption: 'Member dashboard' },
  { src: '/images/marketing/Member-Project-Page.png',
    alt: 'A project page listing its members and boards',
    caption: 'Project & team management' },
]

const GalleryTileSx = { position: 'relative', aspectRatio: SCREENSHOT_RATIO, border: '1px solid',
  borderColor: 'divider', borderRadius: 2, overflow: 'hidden', transition: 'opacity 0.15s',
  '&:hover': {opacity: 0.85} }
const GallerySizes = '(max-width: 600px) 100vw, (max-width: 900px) 50vw, 33vw'

interface GalleryCardProps extends GalleryImage { onOpen: () => void }

export const GalleryCard = ({src, alt, caption, onOpen}: GalleryCardProps) => (
  <Grid item xs={12} sm={6} md={4}>
    <ButtonBase onClick={onOpen} sx={{ display: 'block', width: '100%', borderRadius: 2 }}>
      <Box sx={GalleryTileSx}>
        <CoverImg src={src} alt={alt} sizes={GallerySizes} />
      </Box>
    </ButtonBase>
    <Typography variant={'body2'} color={'text.secondary'} sx={{ mt: 1 }}>{caption}</Typography>
  </Grid>
)

const LightboxCloseSx = { position: 'absolute', top: 8, right: 8, zIndex: 1,
  bgcolor: 'rgba(0, 0, 0, 0.6)', color: 'common.white',
  '&:hover': {bgcolor: 'rgba(0, 0, 0, 0.75)'} }
const LightboxImgBoxSx = { position: 'relative', width: '100%', aspectRatio: SCREENSHOT_RATIO }

interface LightboxProps { image: GalleryImage | null; onClose: () => void }

export const Lightbox = ({image, onClose}: LightboxProps) => (
  <Dialog open={Boolean(image)} onClose={onClose} maxWidth={'lg'} fullWidth>
    { image && (
      <>
        <IconButton onClick={onClose} sx={LightboxCloseSx} aria-label={'Close'}>
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={LightboxImgBoxSx}>
            <Image src={image.src} alt={image.alt} fill sizes={'90vw'}
              style={{ objectFit: 'contain' }} />
          </Box>
        </DialogContent>
      </>
    ) }
  </Dialog>
)
