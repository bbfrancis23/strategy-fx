import { useContext, useState, MouseEvent} from "react"
import { Box, IconButton, Stack, Menu, MenuItem, Fade, MenuProps } from "@mui/material"
import { alpha, styled } from '@mui/material/styles'
import PublicIcon from '@mui/icons-material/Public'
import PrivateIcon from '@mui/icons-material/Lock'
import DropDownMenuIcon from '@mui/icons-material/ArrowDropDownCircle'
import { useSnackbar } from "notistack"
import axios from "axios"
import router from "next/router"
import { Member, ProjectMemberAvatar } from "@/react/members"
import { ProjectContext } from "@/react/project"
import { BoardTitleForm, BoardOptionsMenu, BoardContext, Board} from "@/react/board"
import {Scope} from "@/react/scope"
import { PermissionCodes } from "@/fx/ui"

const BoardToolbarContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 3, 1, 3),
  backgroundColor: alpha(theme.palette.background.default, 0.7)
}))

export interface BoardToolbarProps { projectBoards: Board[]}

export const BoardToolbar = ({projectBoards}: BoardToolbarProps) => {

  const {enqueueSnackbar} = useSnackbar()
  const {project} = useContext(ProjectContext)
  const {board, setBoard} = useContext(BoardContext)

  const changeScope = async () => {

    const newScope = board.scope === Scope.PUBLIC ? Scope.PRIVATE : Scope.PUBLIC
    try{
      await axios.patch(`/api/projects/${project.id}/boards/${board.id}`, {scope: newScope})
        .then(() => {
          enqueueSnackbar(`SAVED ${board.title} ${newScope}`, {variant: "success"})
          setBoard({...board, scope: newScope})
        }).catch((error) => {
          const errorMessage = error.response.data.message
          enqueueSnackbar(`ERROR saving board scope: ${errorMessage}`, {variant: "error"})
        })

    }catch(e){
      enqueueSnackbar(`Error Making Board Public ${e}`, {variant: "error"})
    }
  }

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const open = Boolean(anchorEl)
  const showBoardMenu = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)
  const onClose = (board: Board):void => setAnchorEl(null)

  const boardDir = `/member/projects/${project.id}/boards/`

  const selectBoard = (boardId: string) => {
    setAnchorEl(null)
    router.push(`${boardDir}${boardId}`)
  }

  const menuProps: MenuProps = {
    id: 'board-list',
    TransitionComponent: Fade,
    anchorOrigin: {horizontal: 'center', vertical: 'bottom'},
    anchorEl, open, onClose,
  }

  return (
    <BoardToolbarContainer >
      <Stack direction={'row'} spacing={1}>
        { board.scope !== Scope.PUBLIC && (
          <IconButton color={'error'} onClick={() => changeScope()}><PrivateIcon /></IconButton>
        )}
        { board.scope === Scope.PUBLIC && (
          <IconButton color={'success'} onClick={() => changeScope()}><PublicIcon /></IconButton>
        ) }
        <BoardTitleForm />
        <IconButton onClick={showBoardMenu} ><DropDownMenuIcon /></IconButton>
        <Menu {...menuProps}>
          { projectBoards.map( (b: Board) => (
            <MenuItem key={b.id} selected={board.id === b.id} onClick={() => selectBoard(b.id)}>
              {b.title}
            </MenuItem>
          ))}
        </Menu>
      </Stack>
      <Stack direction={'row'} spacing={1}>
        <ProjectMemberAvatar type={PermissionCodes.PROJECT_LEADER} member={project.leader} />
        { project?.admins?.map( (admin: Member) => (
          <ProjectMemberAvatar type={PermissionCodes.PROJECT_ADMIN} member={admin} key={admin.id}/>
        ))}
        { project?.members?.map( (m: Member) => (
          <ProjectMemberAvatar type={PermissionCodes.PROJECT_MEMBER} member={m} key={m.id}/>
        ))}
        <BoardOptionsMenu />
      </Stack>
    </BoardToolbarContainer>
  )
}
// QA: Brian Francisc 10-23-23