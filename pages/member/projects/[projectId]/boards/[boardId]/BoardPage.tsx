import { useState } from "react"
import { GetServerSideProps } from "next"
import Head from "next/head"
import { getSession } from "next-auth/react"
import { Stack } from "@mui/material"
import { resetServerContext } from "react-beautiful-dnd"
import { findMember } from "@/mongo/controls/member/memberControls"
import { findProject, findProjectBoards } from "@/mongo/controls/project/projectControls"
import findPublicBoard from "@/mongo/controls/member/project/board/findPublicBoard"
import { unAuthRedirect } from "@/error"
import { Board, BoardToolbar, ProjectBoard, BoardContext, BoardThemeBG } from "@/react/board"
import { Project, ProjectContext} from "@/react/project/"
import { Member, MemberContext } from "@/react/members"
import { PermissionCodes, permission } from "@/fx/ui"
import { ItemDialog } from "@/react/item"
export interface BoardPage {
  project: Project;
  projectBoards: Board[];
  board: Board;
  member: Member;
}

export const getServerSideProps:
GetServerSideProps<BoardPage> = async(context) => {
  const authSession = await getSession({req: context.req})

  if(!authSession) return {redirect: unAuthRedirect}

  const member: Member | false = await findMember(authSession?.user?.email)

  if(!member) return {redirect: unAuthRedirect}

  if(!context.query.projectId) return {redirect: unAuthRedirect}

  if( typeof context.query.projectId !== "string" ) return {redirect: unAuthRedirect}

  const project: any = await findProject(context.query.projectId)

  const hasPermission = permission({code: PermissionCodes.PROJECT_MEMBER, member, project})

  if(!hasPermission) return {redirect: unAuthRedirect}

  let board: any = await findPublicBoard(context.query.boardId)

  if(!board) return {redirect: unAuthRedirect}

  resetServerContext()

  let projectBoards: Board[] = await findProjectBoards(project.id)

  return {props: {key: context.params, project, projectBoards, member, board}}

}

export const Page = (props: BoardPage) => {

  const [member, setMember] = useState<Member>(props.member)

  const [project, setProject] = useState<Project>(props.project)
  const [board, setBoard] = useState<Board>(props.board)

  const [itemDialogIsOpen, setItemDialogIsOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<null | string>('')

  return (
    <ProjectContext.Provider value={{project, setProject, setItemDialogIsOpen, setSelectedItem}}>
      <BoardContext.Provider value={{board, setBoard}}>
        <Head>
          <title>{`${board.title}- Strategy Fx - Board Page`}</title>
        </Head>
        <MemberContext.Provider value={{member, setMember}}>
          <BoardThemeBG>
            <BoardToolbar projectBoards={props.projectBoards}/>
            <Stack spacing={2}
              sx={{ p: 2, width: '100%', overflowX: 'hidden', overflowY: 'auto',
                height: 'calc(100vh - 124px)' }} >
              <ProjectBoard />
            </Stack>
          </BoardThemeBG>
          <ItemDialog
            dialogIsOpen={itemDialogIsOpen}
            closeDialog={() => setItemDialogIsOpen(false)} itemId={selectedItem}/>
        </MemberContext.Provider>
      </BoardContext.Provider>
    </ProjectContext.Provider>
  )
}

export default Page
// QA: Brian Francisc 11-23-23
