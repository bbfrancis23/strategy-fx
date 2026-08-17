import { useState, MouseEvent, useContext } from "react"
import { Box, Button, Fade, IconButton, Menu, MenuItem, MenuList, MenuProps } from "@mui/material"
import MenuIcon from '@mui/icons-material/MoreVert'
import { useSnackbar } from "notistack"
import { useConfirm } from "material-ui-confirm"
import axios from "axios"
import { Column } from "@/react/column"
import { ProjectContext } from "@/react/project"
import { MemberContext } from "@/react/members"
import { BoardContext } from "@/react/board"
import {Permission, PermissionCodes } from "@/fx/ui"
import AssessmentSortButton from "./AssessmentSortButton"

export interface ColMenuProps { column: Column}

const ColMenu = ({column}: ColMenuProps) => {

  const {project} = useContext(ProjectContext)
  const {member} = useContext(MemberContext)
  const {board, setBoard} = useContext(BoardContext)
  const {enqueueSnackbar} = useSnackbar()
  const confirm = useConfirm()

  const [anchorElement, setAnchorElement] = useState<null | HTMLElement>(null)

  const open = Boolean(anchorElement)
  const click = (event: MouseEvent<HTMLButtonElement>) => { setAnchorElement(event.currentTarget) }
  const close = () => setAnchorElement(null)

  const archive = async () => {
    try{
      await confirm({description: `Archive ${column.title}`})
        .then( () => {
          const colPath = `/api/members/projects/${project.id}/boards/${board.id}/columns/`
          axios.delete(`${colPath}${column.id}`)
            .then((res) => {
              enqueueSnackbar(`Archived ${column.title}`, {variant: "success"})
              setBoard(res.data.board)
            }).catch((error) => {
              const msg = `Error Archiving Board: ${error.response.data.message}`
              enqueueSnackbar(msg, {variant: "error"})
            })
        })
        .catch((e) => enqueueSnackbar('Archiving aborted', {variant: "error"}) )
    }catch(e){
      enqueueSnackbar(`Error Archiving ${e}`, {variant: "error"})
    }
  }
  const menu: MenuProps = {
    id: "col-menu",
    anchorEl: anchorElement,
    open,
    onClose: close,
    TransitionComponent: Fade,
    anchorOrigin: { vertical: 'bottom', horizontal: 'right', },
    transformOrigin: { vertical: 'top', horizontal: 'right', }
  }

  return (
    <Permission code={PermissionCodes.PROJECT_LEADER} project={project} member={member} >
      <Box>
        <IconButton onClick={click}><MenuIcon /></IconButton>
        <Menu {...menu} >
          <MenuList dense={true} >
            <MenuItem><AssessmentSortButton column={column} close={close} /></MenuItem>
            <MenuItem>
              <Button sx={{width: '100%'}} color="error" onClick={() => archive()}>
                ARCHIVE COLUMN
              </Button>
            </MenuItem>
            <MenuItem >
              <Button sx={{width: '100%'}} onClick={() => close()} color="inherit">CLOSE</Button>
            </MenuItem>
          </MenuList>
        </Menu>
      </Box>
    </Permission>
  )
}

export default ColMenu

// QA Brian Francis 10/26/23