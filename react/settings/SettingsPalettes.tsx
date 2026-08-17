import React, { useContext } from "react"
import { Stack, Box, Theme} from "@mui/material"
import { useTheme } from '@mui/material/styles'
import StarIcon from "@mui/icons-material/Star"
import Fab from "@mui/material/Fab"
import { useSnackbar} from "notistack"
import { FxThemeContext, createFxTheme, fxThemeOptionsList, FxThemeOptions} from "@/fx/theme"


const SettingsPalettes = ( ) => {

  const theme: Theme = useTheme()

  const {fxTheme} = useContext(FxThemeContext)
  const paletteCols = 4

  const {enqueueSnackbar} = useSnackbar()

  const { setFxTheme} = useContext(FxThemeContext)

  const handleUpdateTheme = (index: number) => {

    let fxThemeOptions: FxThemeOptions| undefined = undefined
    setFxTheme((prev) => {
      fxThemeOptions = fxThemeOptionsList[index]
      if (!fxThemeOptions) return prev
      fxThemeOptions.palette.mode = prev.theme.palette.mode
      localStorage.setItem('themeName', fxThemeOptions.name)
      return createFxTheme(fxThemeOptions)
    })

    enqueueSnackbar(`${fxThemeOptionsList[index].name} Theme`)
  }


  const getPaletteButton = (index: number) => (
    <Fab onClick={() => handleUpdateTheme(index)}
      key={index} sx={{
        background:
          `linear-gradient( 
            -25deg, 
            ${fxThemeOptionsList[index].palette.secondary[100]} -50%, 
            ${fxThemeOptionsList[index].palette.primary[800]} 100% )`,
        ":hover":
        { background:
            `linear-gradient( 
              -25deg, 
              ${fxThemeOptionsList[index].palette.secondary[100]} -5%, 
              ${fxThemeOptionsList[index].palette.primary[800]} 100% )`, },
        m: 1,
      }}
      style={{color: theme.palette.getContrastText('#000000')}}
    >
      <StarIcon
        style={{visibility: fxTheme.name === fxThemeOptionsList[index].name ? "visible"
          : "hidden"}} />
    </Fab>
  )

  return (
    <Box >
      <span>Palette:</span>
      <Stack direction={"row"}>
        { fxThemeOptionsList.slice(0, paletteCols).map((t, index) => getPaletteButton(index)) }
      </Stack>
      <Stack direction={"row"} >
        { fxThemeOptionsList.slice(paletteCols, paletteCols + paletteCols)
          .map((t, index) => getPaletteButton((index + paletteCols))) }
      </Stack>
    </ Box>

  )
}
export default SettingsPalettes

// QA done 10-31-23