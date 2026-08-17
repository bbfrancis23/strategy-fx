import { useState, MouseEvent, useContext } from "react"
import router from "next/router"
import { Button, ButtonProps, Fade, IconButton, Menu, MenuItem, MenuProps } from "@mui/material"
import { useConfirm } from "material-ui-confirm"
import MenuIcon from '@mui/icons-material/MoreVert'
import { useSnackbar } from "notistack"
import axios from "axios"
import { ProjectContext } from "@/react/project/"
import { MemberContext } from "@/react/members"
import { BoardContext } from "@/react/board/"
import {Permission, PermissionCodes } from "@/fx/ui"

// test why not working

const BoardOptionsMenu = () => {

  const {project} = useContext(ProjectContext)
  const {member} = useContext(MemberContext)
  const {board} = useContext(BoardContext)
  const {enqueueSnackbar} = useSnackbar()
  const confirm = useConfirm()

  const [anchorEl, setAnchorElement] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)

  const onClick = (event: MouseEvent<HTMLButtonElement>) => setAnchorElement(event.currentTarget)

  const archive = async () => {
    try{
      await confirm({description: `Archive ${board.title}`})
        .then( () => {
          axios.patch(`/api/projects/${project.id}/boards/${board.id}`, {archive: true})
            .then((res) => {
              enqueueSnackbar(`Archived ${board.title}`, {variant: "success"})
              router.push(`/member/projects/${project.id}`)
            }).catch((error) => {
              enqueueSnackbar(`Error Archiving Board: ${error.response.data.message}`,
                {variant: "error"})
            })
        })
        .catch((e) => enqueueSnackbar('Archiving aborted', {variant: "error"}) )
    }catch(e){
      enqueueSnackbar(`Error  Archiving ${e}`, {variant: "error"})
    }
  }

  const onClose = () => setAnchorElement(null)

  const menuProps: MenuProps = {
    id: 'board-menu',
    anchorEl,
    open, onClose,
    TransitionComponent: Fade
  }

  const menuOptionsBunttonProps: ButtonProps = {
    variant: 'contained',
    color: 'error',
    onClick: () => archive(),
    sx: {width: '100%'}
  }

  return (
    <Permission code={PermissionCodes.PROJECT_LEADER} project={project} member={member} >
      <IconButton onClick={onClick}><MenuIcon /></IconButton>
      <Menu {...menuProps} >
        <MenuItem>
          <Button {...menuOptionsBunttonProps}>ARCHIVE BOARD</Button>
        </MenuItem>
        <MenuItem >
          <Button variant={'outlined'} sx={{width: '100%'}} onClick={() => onClose()}>CLOSE</Button>
        </MenuItem>
      </Menu>
    </ Permission>
  )
}

export default BoardOptionsMenu

// QA: Brian Francisc 10-24-23