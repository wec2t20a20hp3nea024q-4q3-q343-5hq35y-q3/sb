// script.js — 滑动华容道 (支持滑动手势 + 点击移动 + 流畅动画)
(function(){
    // ----- DOM 元素 -----
    const puzzleGrid = document.getElementById('puzzleGrid');
    const sizeInput = document.getElementById('gridSize');
    const randomBtn = document.getElementById('randomBtn');
    const resetBtn = document.getElementById('resetBtn');
    const stepSpan = document.getElementById('stepCount');
    const victoryToast = document.getElementById('victoryToast');

    // ----- 游戏配置 -----
    let currentSize = 4;          // N x N (2~8)
    let grid = [];                // 二维数组，0 表示空格
    let stepCount = 0;
    let gameWon = false;

    // ----- 触摸滑动相关变量 -----
    let touchStartX = 0, touchStartY = 0;
    let touchStartRow = -1, touchStartCol = -1;
    let isSwiping = false;
    const SWIPE_THRESHOLD = 20;   // 滑动最小距离(px)

    // ----- 辅助函数 -----
    // 生成标准顺序（空格在右下角）
    function getSolvedState() {
        const total = currentSize * currentSize;
        const newGrid = Array(currentSize).fill().map(() => Array(currentSize).fill(0));
        let value = 1;
        for (let i = 0; i < currentSize; i++) {
            for (let j = 0; j < currentSize; j++) {
                if (i === currentSize-1 && j === currentSize-1) {
                    newGrid[i][j] = 0;
                } else {
                    newGrid[i][j] = value++;
                }
            }
        }
        return newGrid;
    }

    // 查找空格坐标
    function findEmptyPos(gridData) {
        for (let i = 0; i < currentSize; i++) {
            for (let j = 0; j < currentSize; j++) {
                if (gridData[i][j] === 0) return { row: i, col: j };
            }
        }
        return { row: currentSize-1, col: currentSize-1 };
    }

    // 交换两个单元格的值
    function swapCells(gridData, r1, c1, r2, c2) {
        [gridData[r1][c1], gridData[r2][c2]] = [gridData[r2][c2], gridData[r1][c1]];
    }

    // 检查胜利
    function isVictory() {
        let expected = 1;
        for (let i = 0; i < currentSize; i++) {
            for (let j = 0; j < currentSize; j++) {
                if (i === currentSize-1 && j === currentSize-1) {
                    if (grid[i][j] !== 0) return false;
                } else {
                    if (grid[i][j] !== expected) return false;
                    expected++;
                }
            }
        }
        return true;
    }
function moveEmpty(dx, dy) {
        if (gameWon) return false;
        const empty = findEmptyPos(grid);
        const newRow = empty.row + dx;
        const newCol = empty.col + dy;
        if (newRow < 0 || newRow >= currentSize || newCol < 0 || newCol >= currentSize) return false;
        return performMove(newRow, newCol, empty.row, empty.col, true);
    }
    // 更新UI（步数 + 胜利样式）
    function updateUI() {
        stepSpan.innerText = stepCount;
        const win = isVictory();
        if (win && !gameWon) {
            gameWon = true;
            victoryToast.classList.remove('hidden');
            puzzleGrid.classList.add('win-glow');
        } else if (!win && gameWon) {
            gameWon = false;
            victoryToast.classList.add('hidden');
            puzzleGrid.classList.remove('win-glow');
        } else if (!win) {
            victoryToast.classList.add('hidden');
            puzzleGrid.classList.remove('win-glow');
        }
    }

    // 添加交换动画 (给两个位置的方块增加动画类)
    function addSwapAnimation(row1, col1, row2, col2) {
        // 通过当前dom查找对应的tile元素 (因为渲染后 dom 存在)
        const tiles = document.querySelectorAll('.tile');
        if (!tiles.length) return;
        const getTile = (r, c) => {
            for (let tile of tiles) {
                if (tile.getAttribute('data-row') == r && tile.getAttribute('data-col') == c) {
                    return tile;
                }
            }
            return null;
        };
        const tileA = getTile(row1, col1);
        const tileB = getTile(row2, col2);
        if (tileA) {
            tileA.classList.add('tile-animate');
            setTimeout(() => tileA.classList.remove('tile-animate'), 280);
        }
        if (tileB) {
            tileB.classList.add('tile-animate');
            setTimeout(() => tileB.classList.remove('tile-animate'), 280);
        }
    }

    // 核心移动: 交换源格与目标格 (源格移动到空格)
    function performMove(srcRow, srcCol, dstRow, dstCol, withAnimation = true) {
        if (srcRow === dstRow && srcCol === dstCol) return false;
        if (grid[srcRow][srcCol] === 0) return false;   // 源不能是空格
        
        // 交换数据
        swapCells(grid, srcRow, srcCol, dstRow, dstCol);
        stepCount++;
        // 重新渲染网格
        renderGrid();
        // 添加动画（渲染后dom已更新）
        if (withAnimation) {
            addSwapAnimation(srcRow, srcCol, dstRow, dstCol);
        }
        updateUI();
        return true;
    }

    // 尝试移动指定格子的相邻移动（传统点击使用）
    function tryMoveAdjacent(row, col) {
        if (gameWon) return false;
        if (grid[row][col] === 0) return false;
        const empty = findEmptyPos(grid);
        const isAdjacent = (Math.abs(row - empty.row) + Math.abs(col - empty.col)) === 1;
        if (!isAdjacent) return false;
        return performMove(row, col, empty.row, empty.col, true);
    }

    // 根据滑动方向移动：起点(row,col) 向方向滑动 (dx,dy)
    function tryMoveByDirection(row, col, dx, dy) {
        if (gameWon) return false;
        if (grid[row][col] === 0) return false;
        const targetRow = row + dx;
        const targetCol = col + dy;
        if (targetRow < 0 || targetRow >= currentSize || targetCol < 0 || targetCol >= currentSize) return false;
        // 目标必须是空格
        if (grid[targetRow][targetCol] !== 0) return false;
        return performMove(row, col, targetRow, targetCol, true);
    }

    // ---------- 随机打乱（通过随机合法移动保证可解）----------
    function randomShuffle() {
        // 重置为标准顺序
        grid = getSolvedState();
        stepCount = 0;
        gameWon = false;
        victoryToast.classList.add('hidden');
        puzzleGrid.classList.remove('win-glow');
        
        const totalCells = currentSize * currentSize;
        let moves = Math.min(500, Math.max(120, totalCells * 10));
        for (let i = 0; i < moves; i++) {
            const empty = findEmptyPos(grid);
            const neighbors = [];
            const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
            for (let [dr, dc] of dirs) {
                const nr = empty.row + dr, nc = empty.col + dc;
                if (nr>=0 && nr<currentSize && nc>=0 && nc<currentSize) neighbors.push([nr, nc]);
            }
            if (neighbors.length) {
                const rand = Math.floor(Math.random() * neighbors.length);
                const [nr, nc] = neighbors[rand];
                swapCells(grid, empty.row, empty.col, nr, nc);
            }
        }
        stepCount = 0;
        gameWon = false;
        renderGrid();
        updateUI();
    }

    // 重置为顺序状态
    function resetToOrder() {
        grid = getSolvedState();
        stepCount = 0;
        gameWon = false;
        victoryToast.classList.add('hidden');
        puzzleGrid.classList.remove('win-glow');
        renderGrid();
        updateUI();
    }

    // ---------- 渲染网格并绑定触摸&点击事件 (支持手势滑动+点击)----------
    function renderGrid() {
        puzzleGrid.style.gridTemplateColumns = `repeat(${currentSize}, minmax(55px, 1fr))`;
        puzzleGrid.innerHTML = '';
        
        for (let i = 0; i < currentSize; i++) {
            for (let j = 0; j < currentSize; j++) {
                const value = grid[i][j];
                const tile = document.createElement('div');
                tile.className = 'tile';
                if (value === 0) {
                    tile.classList.add('empty');
                } else {
                    tile.textContent = value;
                }
                tile.setAttribute('data-row', i);
                tile.setAttribute('data-col', j);
                
                // ----- 触摸滑动事件 (移动端核心) -----
                tile.addEventListener('touchstart', handleTouchStart);
                tile.addEventListener('touchmove', handleTouchMove);
                tile.addEventListener('touchend', handleTouchEnd);
                // 防止鼠标右键菜单干扰 (PC友好)
                tile.addEventListener('contextmenu', (e) => e.preventDefault());
                
                // 点击事件（PC或移动轻触fallback，但为了不与滑动冲突，会通过全局标志抑制）
                // 注意: 触摸滑动结束后会阻止click，所以这里可以放心添加click做兼容
                tile.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // 如果刚刚完成滑动操作，跳过本次click避免重复移动
                    if (window._swipeJustTriggered) {
                        window._swipeJustTriggered = false;
                        return;
                    }
                    const row = parseInt(tile.getAttribute('data-row'));
                    const col = parseInt(tile.getAttribute('data-col'));
                    tryMoveAdjacent(row, col);
                });
                
                puzzleGrid.appendChild(tile);
            }
        }
        
        if (gameWon) puzzleGrid.classList.add('win-glow');
        else puzzleGrid.classList.remove('win-glow');
    }
    
    // ----- 触摸滑动具体实现 -----
    function handleTouchStart(e) {
        e.preventDefault();      // 防止页面滚动或缩放（完全由js控制滑动）
        const tile = e.currentTarget;
        const row = parseInt(tile.getAttribute('data-row'));
        const col = parseInt(tile.getAttribute('data-col'));
        touchStartRow = row;
        touchStartCol = col;
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isSwiping = true;
        window._swipeJustTriggered = false;
    }
    
    function handleTouchMove(e) {
        if (!isSwiping) return;
        e.preventDefault();      // 关键：阻止页面滚动，保证滑动体验
        // 可不需要额外逻辑，仅记录（在end时判断方向）
    }
    
    function handleTouchEnd(e) {
        if (!isSwiping) return;
        e.preventDefault();
        if (touchStartRow === -1 || touchStartCol === -1) {
            isSwiping = false;
            return;
        }
        
        const changedTouch = e.changedTouches[0];
        if (!changedTouch) {
            isSwiping = false;
            return;
        }
        const endX = changedTouch.clientX;
        const endY = changedTouch.clientY;
        const deltaX = endX - touchStartX;
        const deltaY = endY - touchStartY;
        const absX = Math.abs(deltaX);
        const absY = Math.abs(deltaY);
        
        let moved = false;
        // 滑动阈值超过20px才判定为有效滑动
        if (Math.max(absX, absY) > SWIPE_THRESHOLD) {
            if (absX > absY) {
                // 水平滑动
                if (deltaX > 0) {
                    // 向右滑动 -> 移动当前数字向右，需要右侧格子为空
                    moved = tryMoveByDirection(touchStartRow, touchStartCol, 0, 1);
                } else {
                    // 向左滑动
                    moved = tryMoveByDirection(touchStartRow, touchStartCol, 0, -1);
                }
            } else {
                // 垂直滑动
                if (deltaY > 0) {
                    // 向下滑动
                    moved = tryMoveByDirection(touchStartRow, touchStartCol, 1, 0);
                } else {
                    // 向上滑动
                    moved = tryMoveByDirection(touchStartRow, touchStartCol, -1, 0);
                }
            }
        }
        
        // 如果触发了滑动移动，设置全局标志，防止click重复触发移动
        if (moved) {
            window._swipeJustTriggered = true;
            setTimeout(() => {
                if (window._swipeJustTriggered) window._swipeJustTriggered = false;
            }, 100);
        } else {
            // 未移动(无效滑动) 或者滑动距离不足，不额外操作，但也要阻止click? 不需要阻止
            window._swipeJustTriggered = false;
        }
        
        // 重置状态
        touchStartRow = -1;
        touchStartCol = -1;
        isSwiping = false;
    }
    
    
    // ----- 改变网格大小 -----
    function changeSize() {
        let newSize = parseInt(sizeInput.value);
        if (isNaN(newSize)) newSize = 4;
        newSize = Math.min(8, Math.max(2, newSize));
        sizeInput.value = newSize;
        if (newSize === currentSize) {
            randomShuffle();  // 同尺寸重新开局
            return;
        }
        currentSize = newSize;
        grid = getSolvedState();
        stepCount = 0;
        gameWon = false;
        victoryToast.classList.add('hidden');
        puzzleGrid.classList.remove('win-glow');
        renderGrid();
        updateUI();
        // 可选择性再打乱一下，但保持顺序让用户自己随机
    }
    
    // ----- 事件绑定 -----
    function bindControls() {
        randomBtn.addEventListener('click', () => randomShuffle());
        resetBtn.addEventListener('click', () => resetToOrder());
        sizeInput.addEventListener('change', changeSize);
        window.addEventListener('keydown', handleKeydown);
    }
     function handleKeydown(e) {
        const key = e.key.toLowerCase();
        if (gameWon) return;
        let moved = false;
        switch(key) {
            case 'w': moved = moveEmpty(-1, 0); break;   // 上
            case 's': moved = moveEmpty(1, 0); break;    // 下
            case 'a': moved = moveEmpty(0, -1); break;   // 左
            case 'd': moved = moveEmpty(0, 1); break;    // 右
            default: return;
        }
        if (moved) {
            e.preventDefault();
        }
    }
    // ----- 初始化游戏 -----
    function init() {
        currentSize = 4;
        sizeInput.value = 4;
        grid = getSolvedState();
        stepCount = 0;
        gameWon = false;
        renderGrid();
        updateUI();
        bindControls();
        setTimeout(() => randomShuffle(), 80);
    }
    
    init();
})();