import { Stack, StackProps } from "@mui/material"
import { Draggable, Droppable } from "react-beautiful-dnd"
import { Item } from "@/react/item"
import { Column, ColumnListItem } from "@/react/column"

export interface ColumnListProps { column: Column}

const ColumnList = ({column}: ColumnListProps) => {

  const stackProps: StackProps = {
    spacing: 2,
    sx: {
      minHeight: 5
    }
  }

  return (
    <>
      <Droppable droppableId={column.id} type="LIST" >
        {(dropProvided) => (
          <Stack {...stackProps} {...dropProvided.droppableProps} ref={dropProvided.innerRef}>
            { column.items.map( (i: Item, index:number) => (
              <Draggable key={i.id} draggableId={i.id} index={index}
                disableInteractiveElementBlocking>
                {(dragProvided, dragSnapshot) => (
                  <div ref={dragProvided.innerRef} {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}>
                    <ColumnListItem item={i}/>
                  </ div>
                )}
              </Draggable>
            ) ) }
            {dropProvided.placeholder}
          </Stack>
        )}
      </Droppable>
    </>
  )
}

export default ColumnList

// QA: Brian Francisc 10-25-23