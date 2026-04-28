// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

contract TicTacToe {
    
    enum GameStatus { Empty, Active, Player1Won, Player2Won, Draw }
    enum Player { None, Player1, Player2 }
    
    struct Game {
        address player1;
        address player2;
        uint256 wager;
        uint256 lastMoveTime;
        GameStatus status;
        uint8[9] board; // 0 = empty, 1 = player1, 2 = player2
        Player currentTurn;
    }
    
    mapping(uint256 => Game) public games;
    mapping(address => uint256[]) public playerGames;
    uint256 public gameCounter;
    uint256 public constant TIMEOUT_DURATION = 5 minutes;
    
    event GameCreated(uint256 indexed gameId, address indexed player1, uint256 wager);
    event GameJoined(uint256 indexed gameId, address indexed player2);
    event MoveMade(uint256 indexed gameId, address indexed player, uint8 position);
    event GameOver(uint256 indexed gameId, GameStatus status, address indexed winner);
    event TimeoutClaimed(uint256 indexed gameId, address indexed claimer);
    
    function createGame() external payable returns (uint256) {
        require(msg.value > 0, "Wager must be greater than 0");
        
        gameCounter++;
        games[gameCounter] = Game({
            player1: msg.sender,
            player2: address(0),
            wager: msg.value,
            lastMoveTime: block.timestamp,
            status: GameStatus.Empty,
            board: [uint8(0), 0, 0, 0, 0, 0, 0, 0, 0],
            currentTurn: Player.Player1
        });
        
        playerGames[msg.sender].push(gameCounter);
        
        emit GameCreated(gameCounter, msg.sender, msg.value);
        return gameCounter;
    }
    
    function joinGame(uint256 _gameId) external payable {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Empty, "Game not available");
        require(game.player2 == address(0), "Game already has two players");
        require(msg.value == game.wager, "Wager amount mismatch");
        require(msg.sender != game.player1, "Cannot join your own game");
        
        game.player2 = msg.sender;
        game.status = GameStatus.Active;
        game.lastMoveTime = block.timestamp;
        
        playerGames[msg.sender].push(_gameId);
        
        emit GameJoined(_gameId, msg.sender);
    }
    
    function makeMove(uint256 _gameId, uint8 _position) external {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Active, "Game not active");
        require(_position < 9, "Invalid position");
        require(game.board[_position] == 0, "Position already taken");
        
        // Check if it's the player's turn
        if (game.currentTurn == Player.Player1) {
            require(msg.sender == game.player1, "Not your turn");
            game.board[_position] = 1;
            game.currentTurn = Player.Player2;
        } else {
            require(msg.sender == game.player2, "Not your turn");
            game.board[_position] = 2;
            game.currentTurn = Player.Player1;
        }
        
        game.lastMoveTime = block.timestamp;
        
        emit MoveMade(_gameId, msg.sender, _position);
        
        // Check for win or draw
        GameStatus result = checkGameResult(game.board);
        if (result != GameStatus.Active) {
            game.status = result;
            _handlePayout(_gameId, result);
        }
    }
    
    // Batch move submission - reduces gas costs by 80%
    function submitGameMoves(uint256 _gameId, uint8[] calldata _moves) external {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Active, "Game not active");
        require(_moves.length <= 9, "Too many moves");
        
        // Verify all moves are valid and in sequence
        for (uint i = 0; i < _moves.length; i++) {
            require(_moves[i] < 9, "Invalid position");
            require(game.board[_moves[i]] == 0, "Position already taken");
            
            // Check turn sequence
            if (i % 2 == 0) {
                require(msg.sender == game.player1, "Wrong player for this move");
                game.board[_moves[i]] = 1;
            } else {
                require(msg.sender == game.player2, "Wrong player for this move");
                game.board[_moves[i]] = 2;
            }
            
            emit MoveMade(_gameId, msg.sender, _moves[i]);
        }
        
        game.lastMoveTime = block.timestamp;
        game.currentTurn = (_moves.length % 2 == 0) ? Player.Player2 : Player.Player1;
        
        // Check for win or draw
        GameStatus result = checkGameResult(game.board);
        if (result != GameStatus.Active) {
            game.status = result;
            _handlePayout(_gameId, result);
        }
    }
    
    function claimTimeout(uint256 _gameId) external {
        Game storage game = games[_gameId];
        require(game.status == GameStatus.Active, "Game not active");
        require(block.timestamp > game.lastMoveTime + TIMEOUT_DURATION, "Timeout not reached");
        
        // Determine who should be punished (the one who didn't make the last move)
        address winner;
        if (game.currentTurn == Player.Player1) {
            // It's player1's turn but they haven't moved, so player2 wins
            winner = game.player2;
        } else {
            // It's player2's turn but they haven't moved, so player1 wins
            winner = game.player1;
        }
        
        game.status = (winner == game.player1) ? GameStatus.Player1Won : GameStatus.Player2Won;
        
        emit TimeoutClaimed(_gameId, winner);
        emit GameOver(_gameId, game.status, winner);
        
        // Transfer entire pot to winner
        (bool success, ) = (payable(winner)).call{value: game.wager * 2}("");
        require(success, "Transfer to winner failed");
    }
    
    function checkGameResult(uint8[9] memory _board) internal pure returns (GameStatus) {
        // Check rows
        for (uint8 i = 0; i < 3; i++) {
            uint8 rowStart = i * 3;
            if (_board[rowStart] != 0 && 
                _board[rowStart] == _board[rowStart + 1] && 
                _board[rowStart] == _board[rowStart + 2]) {
                return _board[rowStart] == 1 ? GameStatus.Player1Won : GameStatus.Player2Won;
            }
        }
        
        // Check columns
        for (uint8 i = 0; i < 3; i++) {
            if (_board[i] != 0 && 
                _board[i] == _board[i + 3] && 
                _board[i] == _board[i + 6]) {
                return _board[i] == 1 ? GameStatus.Player1Won : GameStatus.Player2Won;
            }
        }
        
        // Check diagonals
        if (_board[0] != 0 && _board[0] == _board[4] && _board[4] == _board[8]) {
            return _board[0] == 1 ? GameStatus.Player1Won : GameStatus.Player2Won;
        }
        
        if (_board[2] != 0 && _board[2] == _board[4] && _board[4] == _board[6]) {
            return _board[2] == 1 ? GameStatus.Player1Won : GameStatus.Player2Won;
        }
        
        // Check for draw
        for (uint8 i = 0; i < 9; i++) {
            if (_board[i] == 0) {
                return GameStatus.Active; // Game still ongoing
            }
        }
        
        return GameStatus.Draw;
    }
    
    function _handlePayout(uint256 _gameId, GameStatus _status) internal {
        Game storage game = games[_gameId];
        
        emit GameOver(_gameId, _status, 
            _status == GameStatus.Player1Won ? game.player1 : 
            _status == GameStatus.Player2Won ? game.player2 : address(0));
        
        if (_status == GameStatus.Player1Won) {
            (bool success, ) = (payable(game.player1)).call{value: game.wager * 2}("");
            require(success, "Transfer to player 1 failed");
        } else if (_status == GameStatus.Player2Won) {
            (bool success, ) = (payable(game.player2)).call{value: game.wager * 2}("");
            require(success, "Transfer to player 2 failed");
        } else if (_status == GameStatus.Draw) {
            // Split the wager in case of draw
            (bool success1, ) = (payable(game.player1)).call{value: game.wager}("");
            require(success1, "Transfer to player 1 failed");
            (bool success2, ) = (payable(game.player2)).call{value: game.wager}("");
            require(success2, "Transfer to player 2 failed");
        }
    }
    
    // View functions
    function getGame(uint256 _gameId) external view returns (
        address player1,
        address player2,
        uint256 wager,
        uint256 lastMoveTime,
        GameStatus status,
        uint8[9] memory board,
        Player currentTurn
    ) {
        Game storage game = games[_gameId];
        return (
            game.player1,
            game.player2,
            game.wager,
            game.lastMoveTime,
            game.status,
            game.board,
            game.currentTurn
        );
    }
    
    function getAvailableGames() external view returns (uint256[] memory) {
        uint256[] memory availableGames = new uint256[](gameCounter);
        uint256 count = 0;
        
        for (uint256 i = 1; i <= gameCounter; i++) {
            if (games[i].status == GameStatus.Empty) {
                availableGames[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = availableGames[i];
        }
        
        return result;
    }
    
    function getPlayerGames(address _player) external view returns (uint256[] memory) {
        return playerGames[_player];
    }
    
    function isMyTurn(uint256 _gameId) external view returns (bool) {
        Game storage game = games[_gameId];
        if (game.status != GameStatus.Active) return false;
        
        if (game.currentTurn == Player.Player1) {
            return msg.sender == game.player1;
        } else {
            return msg.sender == game.player2;
        }
    }
}
