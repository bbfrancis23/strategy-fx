import { useContext } from "react"
import { Box, BoxProps} from "@mui/material"
import { Draggable, DraggableProvided } from "react-beautiful-dnd"
import { Column, ColumnList, ColMenu, ColumnForm } from "@/react/column"
import { MemberContext } from "@/react/members"
import { ProjectContext } from "@/react/project/"
import {CreateItemForm} from "@/react/item"

import {Permission, PermissionCodes } from "@/fx/ui"
export interface BoardColumnProps {
  index: number
  column: Column
}

export const BoardColumn = ({index, column}: BoardColumnProps) => {

  const {member} = useContext(MemberContext)
  const {project} = useContext(ProjectContext)

  const boardDragBox: BoxProps = {
    sx: { width: '272px', borderRadius: 2, display: 'inline-block' },
    key: column.id
  }

  const boardColBox: BoxProps = {
    sx: {
      display: 'flex',
      flexDirection: 'column',
      bgcolor: 'background.default',
      borderRadius: 3,
      width: 272,
      p: 1 }
  }

  return (
    <Draggable draggableId={column.id} index={index}>
      {(provided: DraggableProvided) => (
        <Box {...boardDragBox} key={column.id} ref={provided.innerRef} {...provided.draggableProps}>
          <Box {...boardColBox} >
            <Box sx={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
              <Box {...provided.dragHandleProps} ><ColumnForm column={column} /></Box>
              <ColMenu column={column}/>
            </Box>
            <ColumnList column={column} />
            <Permission code={PermissionCodes.PROJECT_ADMIN} project={project} member={member}>
              <CreateItemForm column={column} />
            </Permission>
          </Box>
        </Box>
      )}
    </Draggable>
  )
}

export default BoardColumn

// QA: Brian Francisc 10-25-23