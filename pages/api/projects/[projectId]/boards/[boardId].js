import { patchBoard } from '/mongo/controls/project/board/patchBoard';

const handler = async (req, res) => {
  if (req.method === 'PATCH') {
    await patchBoard(req, res);
    return;
  }
  return;
};
export default handler;
