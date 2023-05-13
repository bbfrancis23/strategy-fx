import { useMemo, useState } from "react";

import { Grid } from "@mui/material";

import { DragDropContext, Droppable } from 'react-beautiful-dnd';

import { TagItems } from "../../interfaces/TagItems";
import { Tag } from "../../interfaces/TagInterface";

import TagBoardCol from "./TagBoardCol";
import axios from "axios";

import { useSnackbar } from "notistack";

export interface TagBoardProps{
  tagItems: TagItems[];
  tag: Tag;
  setItemFormDialogOpen: (tagId ?:string) => void
}

const reorder = (list:any, startIndex:number, endIndex:number):string[] => {

  const result: string[] = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  // todo save board map to DB

  return result;
};

export const reorderBoard = ({ boardCols, source, destination }:any) => {

  const current = {...boardCols[source.droppableId]};
  const next = {...boardCols[destination.droppableId]};
  const target = current.items[source.index];

  // moving to same list
  if (source.droppableId === destination.droppableId) {
    let reordered = {...current}
    reordered.items = reorder(current.items, source.index, destination.index);

    const result = {
      ...boardCols,
      [source.droppableId]: reordered
    };
    // todo save board map to localstorage
    return {
      boardCols: result
    };
  }

  // moving to different list

  // remove from original
  current.items.splice(source.index, 1)
  // TODO remove tag from item
  // insert into next
  next.items.splice(destination.index, 0, target)
  // TODO add tag from item

  const result = {
    ...boardCols,
    [source.droppableId]: current,
    [destination.droppableId]: next
  }

  return {
    boardCols: result
  }
};


const TagBoard = (props: TagBoardProps) => {


  const {enqueueSnackbar} = useSnackbar()

  const {tagItems, tag, setItemFormDialogOpen} = props

  let medCols = 12;
  let lgCols = 12;

  if(tagItems.length === 2){
    lgCols = 6
  }else if(tagItems.length > 2){
    medCols = 6
    lgCols = 4
  }

  const [tagCols, setTagCols] = useState<any>()
  const [orderedTagColKeys, setOrderedTagColKeys] = useState<string[]>();


  const handleSetOrderedTagColKeys = (boardCols: string[]) => {

    setOrderedTagColKeys(boardCols)

    axios.patch(`/api/tags/${tag.id}`, {tagCols: boardCols})
      .then((res) => {
        setOrderedTagColKeys(boardCols)
      })
      .catch((e:string) => {
        enqueueSnackbar(`Error Moving Columns: ${e}`, {variant: "error"})
      })
  }

  useMemo ( () => {


    const initTagCols = () => {
      let bc:any = {}
      tagItems.forEach( (t) => bc[t.tag.id] = {tag: t.tag, items: t.items})
      setTagCols(bc);

      return bc
    }

    if(tag.tagCols.length > 0){
      initTagCols()
      setOrderedTagColKeys(tag.tagCols)
    }else{

      const bc = initTagCols()
      setOrderedTagColKeys(Object.keys(bc))
    }


  }, [tagItems, tag])

  // const [selectedTagIds, setSelectedTagIds] = useState<string[]>([tag.id])
  // const [addItemDialogIsOpen, setAddItemDialogIsOpen] = useState<boolean>(false)

  // const handleOpenDialog = (tagId?: string ) => {

  //   if(tagId){
  //     setSelectedTagIds([tag.id, tagId])
  //   }
  //   setAddItemDialogIsOpen(true)
  // }

  const onDragEnd = (result: any) => {

    if(!result.destination) {
      return
    }

    const source = result.source;
    const destination = result.destination;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    if (result.type === 'COLUMN') {
      const redorder: string[] = reorder(orderedTagColKeys, source.index, destination.index);

      handleSetOrderedTagColKeys(redorder);

      return;
    }

    const data:any = reorderBoard({tagCols, source, destination})


    setTagCols(data.boardCols)

  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable
        droppableId="board"
        type="COLUMN"
        direction="horizontal"
      >
        {
          (provided) => (
            <Grid
              container spacing={3}
              sx={{ height: "100%"}}
              ref={provided.innerRef} {...provided.droppableProps}>
              {
                orderedTagColKeys &&
                orderedTagColKeys.map((key: string, index:number) => (
                  <TagBoardCol key={key} medCols={medCols} lgCols={lgCols} tagItem={tagCols[key]}
                    index={index}
                    id={key} setItemFormDialogOpen={(id) => setItemFormDialogOpen(id)} />
                ))}
            </Grid>

          )
        }
      </Droppable>
    </DragDropContext>
  )
}

export default TagBoard