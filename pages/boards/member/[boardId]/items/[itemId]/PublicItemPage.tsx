import { Member } from "@/react/members/member-types"
import { GetServerSideProps, Redirect } from "next"
import { Box, Stack, Typography } from "@mui/material"
import { useSession } from "next-auth/react"
import findMemberPublicBoard from "@/mongo/controls/member/project/board/findMemberPublicBoard"
import { findItem } from "@/mongo/controls/member/project/items/findItem"
import { Board, BoardContext } from "@/react/board"
import { Section } from "@/react/section"
import { Item, ItemContext } from "@/react/item"
import { useEffect, useState } from "react"
import { InfoPageLayout, FxCodeEditor, BoardDrawer} from "@/fx/ui"

import Head from 'next/head'
import Comments from "@/react/comments"

export interface PublicItemPageProps {
  item: Item
  board: Board
}
const unAuthRedirect: Redirect = {destination: "/", permanent: false}

const PageTitle = ({children}: any) => (
  <Typography variant={'h1'} sx={{p: 5, fontSize: {xs: '2rem', sm: '3rem'}, width: '100%' }}>
    {children}
  </Typography>
)

export const getServerSideProps:

GetServerSideProps<PublicItemPageProps> = async(context) => {

  if(!context.query.boardId) return {redirect: unAuthRedirect}
  if( typeof context.query.boardId !== "string" ) return {redirect: unAuthRedirect}

  const board: Board = await findMemberPublicBoard(context.query.boardId)

  if(!board) return {redirect: unAuthRedirect}

  if( typeof context.query.itemId !== "string" ) return {redirect: unAuthRedirect}

  const item = await findItem(context?.query?.itemId)

  return {props: { item, board}}


}

export const PublicItemPage = ( props: any) => {

  const [item, setItem] = useState<Item>(props.item)

  useEffect(() => {
    setItem(props.item)
  }, [props.item])


  const {data: session} = useSession()
  const [member, setMember] = useState<Member | undefined>(undefined)

  useEffect(() => {

    if(session && session.user){
      const castSession = session.user as any
      setMember({id: castSession.id, name: castSession.name, email: castSession.email})
    }
  }, [session])

  return (
    <>
      <Head>
        <title>{`Strategy Fx - ${item.title}`}</title>
      </Head>

      <>
        <BoardContext.Provider value={{ board: props.board, setBoard: () => {}} }>
          <ItemContext.Provider value={{item, setItem}} >
            <BoardDrawer board={props.board} baseUrl={`boards/member/${props.board.id}/items/`} />
            <Box sx={{ml: {xs: 0, sm: '240px'} }}>
              <InfoPageLayout title={ <PageTitle>{item.title} </PageTitle> } >
                <Stack spacing={3} alignItems={'flex-start'} sx={{p: 10, pt: 5, width: '100%'}}>
                  { item.sections?.map( ( s: Section) => {
                    if(s.sectiontype === "63b88d18379a4f30bab59bad"){
                      return ( <FxCodeEditor value={s.content} key={s.id}/> )
                    }
                    return ( <Typography key={s.id}>{s.content}</Typography>)
                  })}
                  <Comments />
                </Stack>
              </InfoPageLayout>
            </Box>
          </ItemContext.Provider>
        </ BoardContext.Provider>
      </>

    </>


  )
}

export default PublicItemPage

// QA Brian Francis 11-02-23