import { useMemo, useState, useContext } from "react"
import { Stack } from "@mui/material"
import { useSnackbar } from "notistack"
import { DragDropContext, DropResult, Droppable, OnDragEndResponder } from "react-beautiful-dnd"
import axios from "axios"
import { ProjectContext } from "@/react/project"
import { BoardContext, ColumnKeyArray, reorderArray, reorderBoard } from "@/react/board"
import { Column, BoardColumn, CreateColumnForm } from "@/react/column"
import { MemberContext } from "@/react/members"
import { Permission, PermissionCodes } from "@/fx/ui"

export const ProjectBoard = ( ) => {

  const {member} = useContext(MemberContext)
  const {project} = useContext(ProjectContext)
  const {board} = useContext(BoardContext)

  const [boardKeyCols, setBoardKeyCols] = useState<ColumnKeyArray>({})
  const [orderedColKeys, setOrderedColKeys] = useState<string[]>([])
  const {enqueueSnackbar} = useSnackbar()

  useMemo( () => {

    let colKeys: ColumnKeyArray = {}
    board.columns.forEach( (c: Column) => colKeys[c.id] = c )
    setOrderedColKeys(Object.keys(colKeys))
    setBoardKeyCols(colKeys)

  }, [board.columns])

  const updateBoardCols = (boardCols: string[]) => {
    setOrderedColKeys(boardCols)

    axios.patch(`/api/projects/${project.id}/boards/${board.id}`, {columns: boardCols})
      .then((res) => {
        console.log(res.data)
        enqueueSnackbar(`Columns Reordered `, {variant: "success"})
      })
      .catch((e:string) => enqueueSnackbar(`Error Moving Columns: ${e}`, {variant: "error"}))
  }

  const onDragEnd: OnDragEndResponder = (result: DropResult) => {
    if(!result.destination) return
    const source = result.source
    const destination = result.destination

    if ( source.droppableId === destination.droppableId && source.index === destination.index ) {
      return
    }

    if (result.type === 'COLUMN') {


      const reorderProps = {
        array: orderedColKeys,
        startIndex: source.index,
        endIndex: destination.index
      }
      const reorder: string[] = reorderArray(reorderProps)
      updateBoardCols(reorder)
      return
    }

    const boardCols = reorderBoard({boardCols: boardKeyCols, source, destination})


    axios.patch(`/api/members/projects/${project.id}/boards/${board.id}`, {boardCols} )
      .then(() => enqueueSnackbar(`Cards Reordered `, {variant: "success"}))
      .catch((e:any) => {
        console.log(e)
        enqueueSnackbar(`Error Moving Cards: ${e}`, {variant: "error"})
      })

    setBoardKeyCols(boardCols)
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="board" type="COLUMN" direction="horizontal" >
        { (provided) => (
          <Stack direction={'row'} spacing={1}
            sx={{overflowX: 'auto', overflowY: 'hidden', pb: 1}}
            ref={provided.innerRef} {...provided.droppableProps}>
            { (orderedColKeys && boardKeyCols) && orderedColKeys.map((key: string, index:number) =>
              ( boardKeyCols[key] && (
                <BoardColumn key={key} index={index} column={boardKeyCols[key]}/>
              ))
            ) }
            <Permission code={PermissionCodes.PROJECT_LEADER} member={member} project={project}>
              <CreateColumnForm />
            </Permission>
            {provided.placeholder}
          </Stack>
        ) }
      </Droppable>
    </DragDropContext>
  )
}

export default ProjectBoard

// QA: Brian Francisc 10-24-23