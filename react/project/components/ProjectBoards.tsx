import { useContext, useState } from "react"
import router from "next/router"
import { Button, Grid, SxProps, Typography } from "@mui/material"
import { Board, BoardStub, CreateBoardForm } from "@/react/board"
import { ProjectContext } from "@/react/project"
import { MemberContext } from "@/react/members"
import { Permission, PermissionCodes } from "@/fx/ui"
import { CreateBoardFormProps } from "@/react/board/components/forms/CreateBoardForm"

interface ProjectBoardsProps { boards: Board[] }

const ProjectBoards = (props: ProjectBoardsProps) => {

  const {project} = useContext(ProjectContext)
  const [boards, setBoards] = useState<Board[]>(props.boards)
  const [showBoardForm, setShowBoardForm] = useState<boolean>(false)
  const {member} = useContext(MemberContext)

  const closeCreateBoardForm = () => { setShowBoardForm(false) }

  const createBoardFormProps: CreateBoardFormProps = {
    setBoards: (b: Board[]) => setBoards(b),
    closeForm: () => closeCreateBoardForm()
  }

  const boardButtonSx: SxProps = { m: 0, p: 0, width: '100%' }

  const boardsDirectory = `/member/projects/${project.id}/boards/`

  return (
    <>
      <Typography variant="h4">Boards</Typography>
      { showBoardForm && (
        <Grid container spacing={1} sx={{ m: 0}}>
          <Grid item xs={12} sm={6} md={4} ><CreateBoardForm {...createBoardFormProps} /></Grid>
        </Grid>
      )}
      <Grid container spacing={1} sx={{pr: 3 }}>
        { boards.map( (b) => (
          <Grid item xs={6} sm={3} md={2} key={b.id}>
            <Button onClick={() => router.push(`${boardsDirectory}${b.id}`)} sx={boardButtonSx}>
              <BoardStub board={b}/>
            </Button>
          </Grid>
        ))}
        <Grid item xs={6} sm={3} md={2}>
          <Permission code={PermissionCodes.PROJECT_LEADER} project={project} member={member} >
            <Button aria-label="create-board" onClick={() => setShowBoardForm(true)}
              sx={{ m: 0, p: 0, width: '100%'}}>
              <BoardStub />
            </Button>
          </Permission>
        </Grid>
      </Grid>
    </>
  )
}

export default ProjectBoards

// QA Brian Francis 10-30-23
