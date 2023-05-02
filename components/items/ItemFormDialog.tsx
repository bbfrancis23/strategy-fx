import {useMemo, useState} from "react"
import {useSession} from "next-auth/react"

import {Button, Stack, DialogContent, DialogActions, Typography,} from "@mui/material"

import axios from "axios"
import {useSnackbar} from "notistack"

import TagsMultiSelect from "../TagsMultiSelect"
import SectionsInupt from "../SectionsInput"
import ItemTitleInput from "../ItemTitleInput"
import DraggableDialog from "../../ui/DraggableDialog"
import { Item } from "../../interfaces/ItemInterface"
import FormModes from "../../enums/FormModes"


export interface ItemFormDialogProps{
  dialogIsOpen: boolean;
  closeDialog: () => void;
  mode: FormModes;
  editItem ?: Item;
  updateEditedItem? : (i: Item) => void;
  tagId ?: string;
}


export default function ItemFormDialog(props: ItemFormDialogProps){

  const {enqueueSnackbar} = useSnackbar()
  const {data: session, status} = useSession()

  const loading = status === "loading"

  const {dialogIsOpen, closeDialog, mode, editItem, updateEditedItem, tagId} = props
  const [item, setItem] = useState<any>({id: ""})


  useMemo(() => {

    if(mode === "EDIT"){
      setItem(editItem)
    }
  }, [editItem, mode])


  useMemo( () => {


    if(!item.id){


      if(dialogIsOpen && session && mode === "ADD"){

        try {
          axios.post("/api/items", {title: ""})
            .then((res) => {
              setItem(res.data.item)
              try {
                axios.post("/api/sections",
                  {
                    sectiontype: "63b2503c49220f42d9fc17d9",
                    content: "", itemId: res.data.item.id, order: 1})
                  .then((sectionsRes) => {

                    enqueueSnackbar("Created a new Item", {variant: "success"})
                    setItem(sectionsRes.data.item)
                  })
                  .catch((e:any) => {
                    enqueueSnackbar(e, {variant: "error"})
                  })
              } catch (e:any) {
                enqueueSnackbar(e, {variant: "error"})
              }
            })
            .catch((e:any) => {
              enqueueSnackbar(e, {variant: "error"})
            })
        } catch (e:any) {
          enqueueSnackbar(e, {variant: "error"})
        }
      }
    }

  }, [
    dialogIsOpen, session, item, mode, enqueueSnackbar
  ])


  const handleSetItem = (i: any) => {
    setItem(i)

    if(mode === "EDIT" && updateEditedItem){

      updateEditedItem(i)
    }
  }

  const handleCloseDialog = () => {
    setItem({id: ""})
    closeDialog()
  }


  return (

    <DraggableDialog
      dialogIsOpen={dialogIsOpen}
      ariaLabel="add-item"
      title={`${mode} ITEM`}
      fullWidth={true}
    >
      <>
        {
          (loading || item?.sections?.length === 0)
            && ( <DialogContent>Loading ...</DialogContent>) }
        {
          (!loading && !session ) &&
            ( <Typography sx={{m: 3}}>Permission Denied</Typography> )
        }
        {
          (!loading && session && item?.sections?.length > 0) && (
            <>
              <DialogContent >
                <Stack spacing={3}>
                  <ItemTitleInput item={item} setItem={(i: any) => handleSetItem(i)}/>
                  <TagsMultiSelect tagId={tagId ? tagId : null}
                    item={item} setItem={(i: any) => handleSetItem(i)} />
                  <SectionsInupt item={item} setItem={(i: any) => handleSetItem(i)} />
                </Stack>
              </DialogContent>
            </>
          )
        }
      </>

      <DialogActions>
        <Button onClick={handleCloseDialog} >CLOSE</Button>
      </DialogActions>
    </DraggableDialog>
  )
}