import React, { useContext } from "react"
import { Box, Button, Typography, Stack, PaletteMode, DialogActions} from "@mui/material"
import DialogContent from "@mui/material/DialogContent"
import ToggleButton from "@mui/material/ToggleButton"
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup"
import { useTheme } from "@mui/material/styles"
import { useSnackbar} from "notistack"
import DarkModeIcon from "@mui/icons-material/DarkMode"
import LightModeIcon from "@mui/icons-material/LightMode"
import SettingsPalettes from "./SettingsPalettes"
import {DraggableDialog} from "@/fx/ui"
import { FxThemeContext, FxThemeOptions, createFxTheme, fxThemeOptionsList } from "@/fx/theme"
import { DialogActions as AppDialogActions, AppDialogs } from "@/react/app/app-types"
import { AppContext } from "@/react/app"

export default function SettingsDialog() {
  const theme = useTheme()
  const {enqueueSnackbar} = useSnackbar()
  const {app, dialogActions} = useContext(AppContext)
  const { setFxTheme} = useContext(FxThemeContext)

  const updateMode = (mode: 'Light' | 'Dark') => {

    let fxThemeOptions: FxThemeOptions| undefined = undefined
    setFxTheme((prev) => {
      fxThemeOptions = fxThemeOptionsList.find((i) => i.name === prev.name)
      if (!fxThemeOptions) return prev
      fxThemeOptions.palette.mode = mode.toLowerCase() as PaletteMode
      localStorage.setItem('themeMode', mode.toLowerCase())
      return createFxTheme(fxThemeOptions)
    })
    enqueueSnackbar(`${mode} Mode` )
  }

  const closeDialog = () => {
    dialogActions({type: AppDialogActions.Close, dialog: AppDialogs.Settings})
  }

  const dialogProps = {
    dialogIsOpen: app.settingsDialogIsOpen,
    ariaLabel: "app-settings",
    title: "SETTINGS",
  }

  return (
    <DraggableDialog {...dialogProps} >
      <DialogContent sx={{width: "100%"}}>
        <Stack direction={"column"} spacing={3}>
          <Box>
            <Typography>Mode:</Typography>
            <ToggleButtonGroup size="small" value={theme.palette.mode}>
              <ToggleButton value="light">
                <LightModeIcon onClick={() => updateMode("Light")} />
              </ToggleButton>
              <ToggleButton value="dark">
                <DarkModeIcon onClick={() => updateMode("Dark")} />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <SettingsPalettes />
        </Stack>
      </DialogContent>
      <DialogActions disableSpacing={false}>
        <Button color="inherit" variant="outlined" onClick={ closeDialog} >Done</Button>
      </DialogActions>
    </DraggableDialog>
  )
}

// QA done 10-31-23