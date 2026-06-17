import type { GameState } from "../game/cards/state/gameTypes";
import "./GameOverOverlay.css";

export default function GameOverOverlay({ game, onPlayAgain, onGoHome }: { game: GameState, onPlayAgain: () => void, onGoHome: () => void }) {
  const winner = game.players.player1.score > game.players.player2.score
    ? "player1"
    : game.players.player2.score > game.players.player1.score
      ? "player2"
      : "draw";

  return (
    <div className="game-over-overlay">
      <div className="game-over-modal">
        <h2 className="game-over-title">
          {winner === "draw" ? "Unentschieden!" : `${game.players[winner].name} gewinnt!`}
        </h2>
        
        <div className="game-over-scores">
          <div className={`score-box ${winner === "player1" ? "score-box--winner" : ""}`}>
            <span className="score-label">{game.players.player1.name}</span>
            <strong className="score-value">{game.players.player1.score}</strong>
          </div>
          <div className="score-divider">:</div>
          <div className={`score-box ${winner === "player2" ? "score-box--winner" : ""}`}>
            <span className="score-label">{game.players.player2.name}</span>
            <strong className="score-value">{game.players.player2.score}</strong>
          </div>
        </div>

        <div className="game-over-actions">
          <button className="primary-button" onClick={onPlayAgain} type="button">
            Nochmal spielen
          </button>
          <button className="secondary-button" onClick={onGoHome} type="button">
            Zurück zum Menü
          </button>
        </div>
      </div>
    </div>
  );
}
