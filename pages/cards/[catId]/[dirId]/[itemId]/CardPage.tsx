import { useEffect, useState } from "react"
import { GetStaticPaths, GetStaticProps } from "next"
import { ParsedUrlQuery } from "querystring"
import { Box, Stack, Typography} from "@mui/material"
import { findItem } from "@/mongo/controls/member/project/items/findItem"
import {findProjectItems} from "@/mongo/controls/member/project/items/findProjectItems"
import { findProject, findProjectBoards } from "@/mongo/controls/project/projectControls"
import Head from 'next/head'
import { WEBSITE_PROJECT_ID } from "@/pages/HomePage"
import { WebsiteBoards } from "@/react/app"
import { Item, ItemContext, getItemDirectory } from "@/react/item"
import { Section } from "@/react/section"
import { Board, BoardContext, getBoardDirectory } from "@/react/board"
import Comments from "@/react/comments"
import { BoardDrawer, InfoPageLayout, FxCodeEditor } from "@/fx/ui"
import { Project, ProjectContext } from "@/react/project"
import { useSession } from "next-auth/react"
import { Member, MemberContext } from "@/react/members"

export interface PublicCardPage {
  item: Item,
  dirId: string,
  catTitle: string,
  colTitle: string,
  board: Board | undefined,
  project: Project
}

type PublicCardPageBackend = Omit<PublicCardPage, "openAuthDialog">

export interface PublicCardPageParams extends ParsedUrlQuery{
  dirId: string
  itemId: string
}

export const getStaticPaths: GetStaticPaths<PublicCardPageParams> = async () => {

  let items: Item[] = await findProjectItems(WEBSITE_PROJECT_ID)

  const paths = items.map( (i: any) =>
    ({params: { catId: getBoardDirectory(i.category), dirId: getItemDirectory(i), itemId: i._id }}))

  return {paths, fallback: false}
}

export const getStaticProps: GetStaticProps<PublicCardPageBackend> = async (context) => {

  const {catId, dirId, itemId} = context.params as PublicCardPageParams

  const item = await findItem(itemId)

  let boards: Board[] = await findProjectBoards(WEBSITE_PROJECT_ID)

  const currentBoardStub = WebsiteBoards.find( (pb: any) => pb.dirId === catId)
  const currentBoard = boards.find( (b: Board) => b.id === currentBoardStub.id)

  let colTitle = ''
  currentBoard?.columns.forEach( (c: any) => {
    const currentItem = c.items.find( (i: any) => i.id === itemId)

    if(currentItem){
      colTitle = c.title
    }
  })

  const catTitle = WebsiteBoards.find( (pb: any) => pb.dirId === catId)?.title
  const project: Project = await findProject(WEBSITE_PROJECT_ID)

  return {props: {catTitle, colTitle, dirId, item, board: currentBoard, project}}

}

const PageTitle = ({children}: any) => (
  <Typography variant={'h1'} sx={{p: 5, fontSize: {xs: '2rem', sm: '3rem'}, width: '100%' }}>
    {children}
  </Typography>
)


export const Page = ({catTitle, colTitle, item: cardItem, board, project}: PublicCardPage) => {

  const [item, setItem] = useState<Item>(cardItem)
  useEffect(() => { setItem(cardItem) }, [cardItem])

  const {data: session} = useSession()

  return (
    <>
      <Head>
        <title>{`Strategy Fx - ${item.title}`}</title>
      </Head>
      {board && (
        <>
          <ProjectContext.Provider value={{project, setProject: () => {} }} >
            <BoardContext.Provider value={{ board, setBoard: () => {}} }>
              <ItemContext.Provider value={{item, setItem}} >
                <BoardDrawer board={board} />
                <Box sx={{ml: {xs: 0, sm: '240px'} }}>
                  <InfoPageLayout
                    title={ <PageTitle>{catTitle} : {colTitle} <br /> {item.title} </PageTitle> }
                  >
                    <Stack
                      spacing={3} alignItems={'flex-start'} sx={{p: 10, pt: 5, width: '100%'}}>
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
            </BoardContext.Provider>
          </ProjectContext.Provider>
        </>
      )}
    </>
  )
}
export default Page

// QA Brian Francis 11-03-23

