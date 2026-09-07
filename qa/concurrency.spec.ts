import {test,expect} from '@playwright/test';
test('rapid draft edits and another window cannot silently overwrite saved work',async({page,context})=>{
 await page.goto('/');await page.getByRole('heading',{name:'What are we making?'}).waitFor();
 const stitches=page.getByLabel('Stitches',{exact:true});await stitches.fill('1');await stitches.fill('123');await stitches.fill('12345');await expect(page.locator('.p-save')).toHaveText('Saved on this device');
 const other=await context.newPage();await other.goto('/');await expect(other.getByLabel('Stitches',{exact:true})).toHaveValue('12345');
 await other.getByLabel('Stitches',{exact:true}).fill('20000');await expect(other.locator('.p-save')).toHaveText('Saved on this device');
 await expect(page.getByRole('alert')).toContainText('another window');await page.getByLabel('Stitches',{exact:true}).fill('30000');await expect(page.locator('.p-save')).toHaveText('Not saved');await page.reload();await expect(page.getByLabel('Stitches',{exact:true})).toHaveValue('20000');
 await page.keyboard.press('Tab');await expect(page.locator(':focus')).toBeVisible();await other.close();
});
