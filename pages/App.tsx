import { useEffect, useState } from "react"
import { PaletteMode, useMediaQuery } from "@mui/material"
import { ThemeProvider } from "@mui/material/styles"
import CssBaseline from "@mui/material/CssBaseline"
import { SnackbarOrigin, SnackbarProvider, SnackbarProviderProps } from "notistack"
import { ConfirmProvider } from "material-ui-confirm"
import { FxTheme, FxThemeContext, FxThemeNames, UpdateThemeOptionsProps, createFxTheme,
  defaultFxTheme, fxThemeOptionsList } from "@/fx/theme"

export interface AppCompoentProps {
  children: JSX.Element | JSX.Element []
}

interface SnackbarProviderTagProps extends Omit<SnackbarProviderProps, 'children'> {}

export const AppComponent = ({children}:AppCompoentProps) => {

  const [fxTheme, setFxTheme] = useState<FxTheme>(defaultFxTheme)

  const smallScreen = useMediaQuery(fxTheme.theme.breakpoints.down('sm'))


  const handleUpdateTheme = (
    options: UpdateThemeOptionsProps,
  ) => {
    let themeName =
      localStorage.getItem('themeName') !== null ?
        localStorage.getItem('themeName') : FxThemeNames.Ocean
    let themeMode = localStorage.getItem('themeMode') ? localStorage.getItem('themeMode') : 'light'

    if (options.name) themeName = options.name
    if (options.mode) themeMode = options.mode

    if (!themeName) return
    if (!themeMode) return

    if (themeMode !== 'light' && themeMode !== 'dark') themeMode = 'light'
    themeName = Object.keys(FxThemeNames).some((tn) => tn === themeName)
      ? themeName
      : FxThemeNames.Ocean

    const fxThemeOptions = fxThemeOptionsList.find((i) => i.name === themeName)
    if (!fxThemeOptions) return

    if (themeMode) fxThemeOptions!.palette.mode = themeMode as PaletteMode

    setFxTheme(createFxTheme(fxThemeOptions))

    localStorage.setItem('themeName', themeName)
    localStorage.setItem('themeMode', themeMode)
  }

  useEffect( () => {
    handleUpdateTheme({})
  }, [])

  const snackbarPos: SnackbarOrigin = {
    horizontal: "right",
    vertical: smallScreen ? "top" : "bottom"
  }

  const snackBarProviderProps: SnackbarProviderTagProps = {
    anchorOrigin: snackbarPos,
    autoHideDuration: 3000,
    maxSnack: 3,
    hideIconVariant: true,
    disableWindowBlurListener: true,
  }

  return (

    <FxThemeContext.Provider value={{fxTheme, setFxTheme}}>
      <ThemeProvider theme={fxTheme.theme}>
        <ConfirmProvider>
          <SnackbarProvider {...snackBarProviderProps}>
            <CssBaseline />
            { children}
          </SnackbarProvider>
        </ConfirmProvider>
      </ThemeProvider>
    </FxThemeContext.Provider>
  )
}

export default AppComponent