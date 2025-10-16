import { UniqueFolderIdPipe } from './unique-folder-id.pipe';

describe('UniqueFolderIdPipe', () => {
  it('create an instance', () => {
    const pipe = new UniqueFolderIdPipe();
    expect(pipe).toBeTruthy();
  });
});
