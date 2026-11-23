import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { MapId } from '../shared/scenario';
import type { Resource } from '../shared/types';

export type Language = 'en' | 'vi';
type Parameters = Record<string, string | number>;
export type Translator = (key: TranslationKey, parameters?: Parameters) => string;

const en = {
  language: 'Language',
  menu: 'Menu',
  backToMainMenuHint: 'Back to the main menu; you can resume this game from there',
  quitGame: 'Quit game',
  quitGameHint: 'End this game for everyone',
  quitGameConfirmTitle: 'End this game for everyone?',
  quitGameWarning: 'The match will be marked abandoned. No winner will be declared, and the game cannot continue.',
  confirmQuitGame: 'End game',
  gameAbandoned: 'Game abandoned',
  gameAbandonedBy: '{name} ended the match. No winner was declared.',
  switchBoardView: 'Switch board view',
  view2d: '2D view',
  view3d: '3D view',
  gameOver: 'Game over',
  yourRoll: 'Your roll',
  playerRolling: '{name} is rolling',
  yourTurn: 'Your turn',
  playerTurn: "{name}’s turn",
  reconnecting: 'reconnecting…',
  entranceLede: 'Settle the island with friends. One of you starts a game and shares the code; everyone else joins with it.',
  yourName: 'Your name',
  startNewGame: 'Start a new game',
  orJoinOne: 'or join one',
  gameCode: 'Game code',
  joinGame: 'Join game',
  enterFourLetterCode: 'Enter the four-letter code from your host.',
  lobbies: 'lobbies',
  finished: 'finished',
  playing: 'playing',
  connectedPlayers: '{connected}/{max}',
  resume: 'Resume',
  join: 'Join',
  backgroundMusic: 'Background music',
  connecting: 'Connecting to the server…',
  shareCode: 'Share this code. Up to {max} players.',
  playerFallback: 'Player',
  host: 'host',
  you: 'you',
  offline: 'offline',
  waitingForPlayer: 'Waiting for a player',
  map: 'Map',
  classicMap: 'Classic',
  classicMapBlurb: 'The standard island, shuffled fresh every game.',
  beginnerMap: 'Fixed board',
  beginnerMapBlurb: 'A beginner-friendly fixed island using the normal opening draft.',
  largeMap: 'Large island',
  largeMapBlurb: 'The 30-hex board from the 5–6 player extension. More room, two deserts.',
  dealBoard: 'Deal the board',
  waitingForMorePlayers: 'Waiting for {count} more',
  waitingForHost: 'Waiting for the host to start.',
  leaveLobby: 'Leave lobby',
  resourceBrick: 'Brick',
  resourceLumber: 'Lumber',
  resourceWool: 'Wool',
  resourceGrain: 'Grain',
  resourceOre: 'Ore',
  road: 'Road',
  settlement: 'Settlement',
  city: 'City',
  robber: 'Robber',
  developmentCards: 'Development cards',
  victoryPoints: 'victory points',
  bank: 'Bank',
  cards: 'cards',
  devShort: 'dev',
  knights: 'knights',
  awardRoad: 'road',
  awardArmy: 'army',
  discarding: 'discarding {count}',
  nothingHappened: 'Nothing has happened yet.',
  oneLessResource: 'One less {resource}',
  oneMoreResource: 'One more {resource}',
  heldCount: '{count} held',
  robberTakesCut: 'The robber takes his cut',
  discardExplanation: 'You are holding {held} cards, so {count} of them go back to the bank. Pick which.',
  chosenCount: '{chosen} of {count} chosen',
  discard: 'Discard',
  takeCard: 'Take a card',
  robberStealExplanation: 'The robber lets you take one card, unseen, from a player on that hex.',
  playerCards: '{count} cards',
  monopoly: 'Monopoly',
  monopolyExplanation: 'Every other player hands you all of this resource.',
  back: 'Back',
  takeThem: 'Take them',
  yearOfPlenty: 'Year of Plenty',
  yearOfPlentyExplanation: 'Take any two resources from the bank. You can take two of the same.',
  chosenResources: 'Chosen: {resources}',
  nothingYet: 'nothing yet',
  noResources: 'no resources',
  clear: 'Clear',
  yourDevelopmentCards: 'Your development cards',
  oneCardPerTurn: 'One card per turn, and never on the turn you bought it.',
  noCardsYet: 'You have no cards yet.',
  play: 'Play',
  close: 'Close',
  knight: 'Knight',
  knightDescription: 'Move the robber and take a card from someone on that hex.',
  roadBuilding: 'Road Building',
  roadBuildingDescription: 'Build two roads for free.',
  yearOfPlentyDescription: 'Take any two resources from the bank.',
  monopolyDescription: 'Name a resource; every other player hands you all of theirs.',
  victoryPointCard: 'Victory Point',
  victoryPointDescription: 'Worth one point. Stays hidden until someone wins.',
  offerOnTable: 'Offer on the table',
  youGiveFor: 'You give {give} for {want}.',
  accepted: 'accepted',
  declined: 'declined',
  countered: 'countered',
  thinking: 'thinking…',
  counterofferFrom: 'Counteroffer from {name}',
  theyGiveWant: 'They give {give} and want {want}.',
  declineCounter: 'Decline counter',
  acceptCounter: 'Accept counter',
  requestedCardsUnavailable: 'You no longer hold the requested cards.',
  withdrawOffer: 'Withdraw offer',
  trade: 'Trade',
  tradeExplanation: 'Offer a swap to the table, or trade straight with the bank.',
  youGive: 'You give',
  inExchangeFor: '↓ in exchange for ↓',
  inExchangeForText: 'in exchange for',
  youWant: 'You want',
  cancel: 'Cancel',
  offerIt: 'Offer it',
  bankAndHarbours: 'Bank and harbours',
  bankRateForOne: '{count} {resource} for',
  needResourcesForBank: 'You need {count} of one resource to trade with the bank.',
  tradeFor: 'Trade for {resource}',
  counterofferSent: 'Counteroffer sent',
  counterofferWaiting: 'Your counteroffer is waiting for {name}.',
  playerWantsToTrade: '{name} wants to trade',
  theyWantBack: 'They give {give} and want {want} back.',
  differentResourceTypes: 'Give and request different resource types.',
  anotherCounterofferWaiting: 'Another player has a counteroffer waiting for a response.',
  noThanks: 'No thanks',
  sendCounter: 'Send counter',
  accept: 'Accept',
  counteroffer: 'Counteroffer',
  doNotHoldWanted: 'You do not hold what they want.',
  tenPointsIslandSettled: 'Ten victory points. The island is settled.',
  playerWins: '{name} wins',
  backToStart: 'Back to the start',
  soundSettings: 'Sound settings',
  soundsOn: 'sounds on',
  soundsOff: 'sounds off',
  muteSounds: 'Mute sounds',
  enableSounds: 'Enable sounds',
  soundVolume: 'Sound volume',
  pauseMusic: 'Pause music',
  playMusic: 'Play music',
  musicSettings: 'Background music settings',
  musicOn: 'music on',
  musicOff: 'music off',
  musicVolume: 'Background music volume',
  catanBoard: 'Catan board',
  resetView: 'Reset view',
  genericHarbourTooltip: 'Harbour: trade any 3 alike for 1',
  specificHarbourTooltip: 'Harbour: trade 2 {resource} for 1',
  firstPlayerRolls: 'First-player rolls',
  waitingToRoll: 'waiting to roll',
  rolledScore: 'rolled {score}',
  rollForFirstPlayer: 'Roll for first player',
  rollDice: 'Roll the dice',
  buyCard: 'Buy card',
  yourCards: 'Your cards ({count})',
  endTurn: 'End turn',
  dieShowing: 'Die showing {value}',
  answerCounteroffer: 'Answer the counteroffer.',
  waitingCounterofferResponse: 'Waiting for the counteroffer response.',
  answerTradeOffer: 'Answer the trade offer.',
  playerIsPlaying: '{name} is playing.',
  rollToChooseFirst: 'Roll the dice to choose the first player.',
  placeSettlement: 'Place a settlement on any free corner.',
  placeRoadNextToIt: 'Place a road next to it.',
  rollToStartTurn: 'Roll to start your turn.',
  moveRobberToHex: 'Move the robber to a new hex.',
  chooseWhoToStealFrom: 'Choose who to steal from.',
  waitingForEveryoneToDiscard: 'Waiting for everyone to discard.',
  discardCards: 'Discard {count} cards.',
  placeFreeRoads: 'Place {count} free roads.',
  logLongestRoadLost: 'Longest Road is no longer held.',
  logLongestRoadWon: 'takes Longest Road ({count} segments).',
  logLongestRoadContested: 'Longest Road is contested and goes unheld.',
  logLargestArmyWon: 'takes Largest Army ({count} knights).',
  logWinner: 'wins the game with {count} victory points!',
  logInitiative: 'Each player rolls to determine who starts.',
  logBeginsFirstTurn: 'begins the first turn.',
  logStealsResource: 'steals a resource from {name}.',
  logBankShortage: 'The bank runs out of {resource} — nobody collects it.',
  logCollects: 'collects {resources}.',
  logCollectsSecondSettlement: 'collects {resources} from the second settlement.',
  logEveryoneDiscard: 'Everyone holding more than 7 cards must discard half.',
  logRollsToChooseFirst: 'rolls {score} to choose the first player.',
  logTieReroll: 'The highest roll is tied at {score}; tied players roll again.',
  logHighestStarts: 'has the highest roll and starts the setup draft.',
  logPlacesSettlement: 'places a settlement.',
  logBuildsRoad: 'builds a road.',
  logRolls: 'rolls {score}.',
  logDiscards: 'discards {resources}.',
  logMovesRobber: 'moves the robber.',
  logBuildsFreeRoad: 'builds a free road.',
  logBuildsSettlement: 'builds a settlement.',
  logUpgradesCity: 'upgrades a settlement to a city.',
  logBuysCard: 'buys a development card.',
  logBankTrade: 'trades {count} {give} for 1 {want}.',
  logOffersTrade: 'offers {give} for {want}.',
  logCountersTrade: 'counters with {give} for {want}.',
  logDeclinesCounter: "declines {name}'s counteroffer.",
  logAcceptsCounter: "accepts {name}'s counteroffer.",
  logTradesWithPlayer: 'trades {give} to {name} for {want}.',
  logTakesTurn: 'takes their turn.',
  logPlaysKnight: 'plays a Knight.',
  logPlaysRoadBuildingSetup: 'plays Road Building — place the roads after rolling.',
  logPlaysRoadBuilding: 'plays Road Building and may build {count} free roads.',
  logPlaysYearOfPlenty: 'plays Year of Plenty and takes {resources}.',
  logPlaysMonopoly: 'plays Monopoly and takes {count} {resource}.',
  errorNoGame: 'No game with that code.',
  errorStarted: 'That game has already started.',
  errorFull: 'That game is full.',
  roomLimitReached: 'You can have at most {max} unfinished rooms. Finish one before creating or joining another.',
  errorSeatMissing: 'That seat is not in this game.',
  errorHostStart: 'Only the host can start the game.',
  errorNeedPlayers: 'You need at least {count} players.',
  errorHostMap: 'Only the host can pick the map.',
  errorMapMissing: 'No such map.',
  errorNotStarted: 'The game has not started.',
  errorNotInGame: 'You are not in a game.',
  errorNotConnected: 'Not connected yet.',
  errorGameUnavailable: 'That game is no longer available.',
  errorSeatReplaced: 'This seat is now active in another connection.',
  errorPersistence: 'Room changes could not be saved and may be lost if the server stops.',
} as const;

export type TranslationKey = keyof typeof en;

const vi: Record<TranslationKey, string> = {
  language: 'Ngôn ngữ',
  menu: 'Menu',
  backToMainMenuHint: 'Quay về menu chính; bạn có thể tiếp tục ván này từ đó',
  quitGame: 'Thoát ván',
  quitGameHint: 'Kết thúc ván chơi cho tất cả mọi người',
  quitGameConfirmTitle: 'Kết thúc ván chơi cho tất cả mọi người?',
  quitGameWarning: 'Ván chơi sẽ được đánh dấu là bỏ dở. Sẽ không có người thắng và ván không thể tiếp tục.',
  confirmQuitGame: 'Kết thúc ván',
  gameAbandoned: 'Ván chơi đã bị bỏ dở',
  gameAbandonedBy: '{name} đã kết thúc ván. Không có người thắng.',
  switchBoardView: 'Đổi chế độ bàn chơi',
  view2d: 'Chế độ 2D',
  view3d: 'Chế độ 3D',
  gameOver: 'Kết thúc ván',
  yourRoll: 'Bạn gieo xúc xắc',
  playerRolling: '{name} đang gieo xúc xắc',
  yourTurn: 'Đến lượt bạn',
  playerTurn: 'Đến lượt {name}',
  reconnecting: 'đang kết nối lại…',
  entranceLede: 'Cùng bạn bè khai phá hòn đảo. Một người tạo ván và chia sẻ mã; những người khác dùng mã đó để tham gia.',
  yourName: 'Tên của bạn',
  startNewGame: 'Tạo ván mới',
  orJoinOne: 'hoặc tham gia ván',
  gameCode: 'Mã phòng',
  joinGame: 'Tham gia ván',
  enterFourLetterCode: 'Nhập mã gồm bốn chữ cái do chủ phòng cung cấp.',
  lobbies: 'Phòng chơi',
  finished: 'đã kết thúc',
  playing: 'đang chơi',
  connectedPlayers: '{connected}/{max}',
  resume: 'Tiếp tục',
  join: 'Tham gia',
  backgroundMusic: 'Nhạc nền',
  connecting: 'Đang kết nối máy chủ…',
  shareCode: 'Chia sẻ mã này. Tối đa {max} người chơi.',
  playerFallback: 'Người chơi',
  host: 'chủ phòng',
  you: 'bạn',
  offline: 'mất kết nối',
  waitingForPlayer: 'Đang chờ người chơi',
  map: 'Bản đồ',
  classicMap: 'Cổ điển',
  classicMapBlurb: 'Hòn đảo tiêu chuẩn, được xáo trộn mới trong mỗi ván.',
  beginnerMap: 'Bản đồ cố định',
  beginnerMapBlurb: 'Hòn đảo cố định thân thiện với người mới, dùng cách chọn vị trí mở đầu thông thường.',
  largeMap: 'Đảo lớn',
  largeMapBlurb: 'Bản đồ 30 ô lục giác của bản mở rộng 5–6 người. Rộng hơn, có hai sa mạc.',
  dealBoard: 'Chia bàn chơi',
  waitingForMorePlayers: 'Đang chờ thêm {count} người',
  waitingForHost: 'Đang chờ chủ phòng bắt đầu.',
  leaveLobby: 'Rời phòng',
  resourceBrick: 'Gạch',
  resourceLumber: 'Gỗ',
  resourceWool: 'Len',
  resourceGrain: 'Lúa mì',
  resourceOre: 'Quặng',
  road: 'Đường',
  settlement: 'Khu định cư',
  city: 'Thành phố',
  robber: 'Kẻ cướp',
  developmentCards: 'Thẻ phát triển',
  victoryPoints: 'điểm chiến thắng',
  bank: 'Ngân hàng',
  cards: 'lá',
  devShort: 'thẻ PT',
  knights: 'hiệp sĩ',
  awardRoad: 'Đường dài nhất',
  awardArmy: 'Đội quân lớn nhất',
  discarding: 'đang bỏ {count} lá',
  nothingHappened: 'Chưa có sự kiện nào.',
  oneLessResource: 'Bớt 1 {resource}',
  oneMoreResource: 'Thêm 1 {resource}',
  heldCount: 'đang có {count}',
  robberTakesCut: 'Kẻ Cướp thu phần của mình',
  discardExplanation: 'Bạn đang có {held} lá, nên phải trả {count} lá về ngân hàng. Hãy chọn lá muốn bỏ.',
  chosenCount: 'Đã chọn {chosen}/{count} lá',
  discard: 'Bỏ bài',
  takeCard: 'Lấy một lá bài',
  robberStealExplanation: 'Kẻ Cướp cho phép bạn rút ngẫu nhiên một lá từ người chơi có nhà cạnh ô đó.',
  playerCards: '{count} lá',
  monopoly: 'Độc quyền',
  monopolyExplanation: 'Mỗi người chơi khác phải đưa bạn toàn bộ tài nguyên này.',
  back: 'Quay lại',
  takeThem: 'Lấy tài nguyên',
  yearOfPlenty: 'Năm sung túc',
  yearOfPlentyExplanation: 'Lấy hai tài nguyên bất kỳ từ ngân hàng. Bạn có thể chọn hai tài nguyên giống nhau.',
  chosenResources: 'Đã chọn: {resources}',
  nothingYet: 'chưa chọn',
  noResources: 'không có tài nguyên',
  clear: 'Xóa lựa chọn',
  yourDevelopmentCards: 'Thẻ phát triển của bạn',
  oneCardPerTurn: 'Mỗi lượt chỉ được dùng một thẻ, và không được dùng ngay trong lượt mua thẻ đó.',
  noCardsYet: 'Bạn chưa có thẻ nào.',
  play: 'Dùng',
  close: 'Đóng',
  knight: 'Hiệp sĩ',
  knightDescription: 'Di chuyển Kẻ Cướp và rút một lá từ người chơi cạnh ô đó.',
  roadBuilding: 'Xây đường',
  roadBuildingDescription: 'Xây miễn phí hai con đường.',
  yearOfPlentyDescription: 'Lấy hai tài nguyên bất kỳ từ ngân hàng.',
  monopolyDescription: 'Chọn một loại tài nguyên; mỗi người chơi khác đưa bạn toàn bộ số tài nguyên đó.',
  victoryPointCard: 'Điểm chiến thắng',
  victoryPointDescription: 'Được một điểm. Giữ kín cho đến khi có người chiến thắng.',
  offerOnTable: 'Lời đề nghị đang mở',
  youGiveFor: 'Bạn đưa {give} để đổi lấy {want}.',
  accepted: 'đồng ý',
  declined: 'từ chối',
  countered: 'đưa ra đề nghị ngược',
  thinking: 'đang suy nghĩ…',
  counterofferFrom: 'Đề nghị ngược từ {name}',
  theyGiveWant: 'Họ đưa {give} và muốn {want}.',
  declineCounter: 'Từ chối đề nghị ngược',
  acceptCounter: 'Chấp nhận đề nghị ngược',
  requestedCardsUnavailable: 'Bạn không còn đủ những lá được yêu cầu.',
  withdrawOffer: 'Rút lời đề nghị',
  trade: 'Giao thương',
  tradeExplanation: 'Đề nghị trao đổi với người chơi khác hoặc giao dịch trực tiếp với ngân hàng.',
  youGive: 'Bạn đưa',
  inExchangeFor: '↓ đổi lấy ↓',
  inExchangeForText: 'đổi lấy',
  youWant: 'Bạn muốn',
  cancel: 'Hủy',
  offerIt: 'Gửi đề nghị',
  bankAndHarbours: 'Ngân hàng và cảng',
  bankRateForOne: '{count} {resource} đổi lấy',
  needResourcesForBank: 'Bạn cần ít nhất {count} tài nguyên cùng loại để giao dịch với ngân hàng.',
  tradeFor: 'Đổi lấy {resource}',
  counterofferSent: 'Đã gửi đề nghị ngược',
  counterofferWaiting: 'Đề nghị ngược của bạn đang chờ {name}.',
  playerWantsToTrade: '{name} muốn giao dịch',
  theyWantBack: 'Họ đưa {give} và muốn nhận lại {want}.',
  differentResourceTypes: 'Loại tài nguyên đưa ra và yêu cầu phải khác nhau.',
  anotherCounterofferWaiting: 'Một người chơi khác đang chờ phản hồi đề nghị ngược.',
  noThanks: 'Không, cảm ơn',
  sendCounter: 'Gửi đề nghị ngược',
  accept: 'Chấp nhận',
  counteroffer: 'Đề nghị ngược',
  doNotHoldWanted: 'Bạn không có đủ tài nguyên họ yêu cầu.',
  tenPointsIslandSettled: 'Đạt 10 điểm chiến thắng. Hòn đảo đã được khai phá.',
  playerWins: '{name} chiến thắng',
  backToStart: 'Về màn hình chính',
  soundSettings: 'Cài đặt âm thanh',
  soundsOn: 'đang bật âm thanh',
  soundsOff: 'đang tắt âm thanh',
  muteSounds: 'Tắt âm thanh',
  enableSounds: 'Bật âm thanh',
  soundVolume: 'Âm lượng hiệu ứng',
  pauseMusic: 'Tạm dừng nhạc',
  playMusic: 'Phát nhạc',
  musicSettings: 'Cài đặt nhạc nền',
  musicOn: 'đang bật nhạc',
  musicOff: 'đang tắt nhạc',
  musicVolume: 'Âm lượng nhạc nền',
  catanBoard: 'Bàn chơi Catan',
  resetView: 'Đặt lại góc nhìn',
  genericHarbourTooltip: 'Cảng: đổi 3 tài nguyên cùng loại lấy 1 tài nguyên bất kỳ',
  specificHarbourTooltip: 'Cảng: đổi 2 {resource} lấy 1',
  firstPlayerRolls: 'Kết quả gieo để chọn người đi đầu',
  waitingToRoll: 'đang chờ gieo',
  rolledScore: 'gieo được {score}',
  rollForFirstPlayer: 'Gieo để chọn người đi đầu',
  rollDice: 'Gieo xúc xắc',
  buyCard: 'Mua thẻ',
  yourCards: 'Thẻ của bạn ({count})',
  endTurn: 'Kết thúc lượt',
  dieShowing: 'Xúc xắc hiện {value} chấm',
  answerCounteroffer: 'Hãy trả lời đề nghị ngược.',
  waitingCounterofferResponse: 'Đang chờ phản hồi đề nghị ngược.',
  answerTradeOffer: 'Hãy trả lời lời đề nghị giao dịch.',
  playerIsPlaying: '{name} đang chơi.',
  rollToChooseFirst: 'Gieo xúc xắc để chọn người đi đầu.',
  placeSettlement: 'Đặt khu định cư tại một giao lộ còn trống.',
  placeRoadNextToIt: 'Đặt một con đường nối với khu định cư đó.',
  rollToStartTurn: 'Gieo xúc xắc để bắt đầu lượt.',
  moveRobberToHex: 'Di chuyển Kẻ Cướp sang một ô lục giác khác.',
  chooseWhoToStealFrom: 'Chọn người chơi để cướp một lá.',
  waitingForEveryoneToDiscard: 'Đang chờ mọi người bỏ bài.',
  discardCards: 'Bỏ {count} lá bài.',
  placeFreeRoads: 'Đặt {count} con đường miễn phí.',
  logLongestRoadLost: 'Không còn ai giữ danh hiệu Đường dài nhất.',
  logLongestRoadWon: 'giành danh hiệu Đường dài nhất ({count} đoạn đường).',
  logLongestRoadContested: 'Đường dài nhất đang hòa; chưa có ai giữ danh hiệu.',
  logLargestArmyWon: 'giành danh hiệu Đội quân lớn nhất ({count} hiệp sĩ).',
  logWinner: 'chiến thắng với {count} điểm chiến thắng!',
  logInitiative: 'Mỗi người gieo xúc xắc để xác định thứ tự đi đầu.',
  logBeginsFirstTurn: 'bắt đầu lượt đầu tiên.',
  logStealsResource: 'cướp một tài nguyên từ {name}.',
  logBankShortage: 'Ngân hàng hết {resource} — không ai nhận được tài nguyên.',
  logCollects: 'nhận được {resources}.',
  logCollectsSecondSettlement: 'nhận được {resources} từ khu định cư thứ hai.',
  logEveryoneDiscard: 'Người chơi có hơn 7 lá phải bỏ đi một nửa.',
  logRollsToChooseFirst: 'gieo được {score} để chọn người đi đầu.',
  logTieReroll: 'Kết quả cao nhất bị hòa ở mức {score}; những người hòa sẽ gieo lại.',
  logHighestStarts: 'có kết quả cao nhất và bắt đầu chọn vị trí mở đầu.',
  logPlacesSettlement: 'đặt một khu định cư.',
  logBuildsRoad: 'xây một con đường.',
  logRolls: 'gieo được {score}.',
  logDiscards: 'bỏ {resources}.',
  logMovesRobber: 'di chuyển Kẻ Cướp.',
  logBuildsFreeRoad: 'xây một con đường miễn phí.',
  logBuildsSettlement: 'xây một khu định cư.',
  logUpgradesCity: 'nâng cấp khu định cư thành thành phố.',
  logBuysCard: 'mua một thẻ phát triển.',
  logBankTrade: 'đổi {count} {give} lấy 1 {want}.',
  logOffersTrade: 'đề nghị đổi {give} lấy {want}.',
  logCountersTrade: 'đưa ra đề nghị ngược: đổi {give} lấy {want}.',
  logDeclinesCounter: 'từ chối đề nghị ngược của {name}.',
  logAcceptsCounter: 'chấp nhận đề nghị ngược của {name}.',
  logTradesWithPlayer: 'đổi {give} cho {name} để lấy {want}.',
  logTakesTurn: 'thực hiện lượt của mình.',
  logPlaysKnight: 'dùng thẻ Hiệp sĩ.',
  logPlaysRoadBuildingSetup: 'dùng thẻ Xây đường — hãy đặt đường sau khi gieo xúc xắc.',
  logPlaysRoadBuilding: 'dùng thẻ Xây đường và có thể xây miễn phí {count} con đường.',
  logPlaysYearOfPlenty: 'dùng thẻ Năm sung túc và nhận {resources}.',
  logPlaysMonopoly: 'dùng thẻ Độc quyền và lấy {count} {resource}.',
  errorNoGame: 'Không tìm thấy ván chơi với mã này.',
  errorStarted: 'Ván chơi này đã bắt đầu.',
  errorFull: 'Ván chơi đã đủ người.',
  roomLimitReached: 'Bạn chỉ có thể có tối đa {max} phòng chưa kết thúc. Hãy kết thúc một phòng trước khi tạo hoặc tham gia phòng khác.',
  errorSeatMissing: 'Chỗ ngồi này không thuộc ván chơi.',
  errorHostStart: 'Chỉ chủ phòng mới có thể bắt đầu ván.',
  errorNeedPlayers: 'Cần ít nhất {count} người chơi.',
  errorHostMap: 'Chỉ chủ phòng mới có thể chọn bản đồ.',
  errorMapMissing: 'Không tìm thấy bản đồ này.',
  errorNotStarted: 'Ván chơi chưa bắt đầu.',
  errorNotInGame: 'Bạn không ở trong ván chơi nào.',
  errorNotConnected: 'Chưa kết nối.',
  errorGameUnavailable: 'Ván chơi này không còn khả dụng.',
  errorSeatReplaced: 'Chỗ chơi này hiện đang hoạt động ở một kết nối khác.',
  errorPersistence: 'Không thể lưu thay đổi phòng; dữ liệu có thể bị mất khi máy chủ dừng.',
};

const dictionaries: Record<Language, Record<TranslationKey, string>> = { en, vi };
const LANGUAGE_KEY = 'catan.language';
const RESOURCE_KEYS: Record<Resource, TranslationKey> = {
  brick: 'resourceBrick',
  lumber: 'resourceLumber',
  wool: 'resourceWool',
  grain: 'resourceGrain',
  ore: 'resourceOre',
};
const MAP_NAME_KEYS: Record<MapId, TranslationKey> = {
  classic: 'classicMap',
  beginner: 'beginnerMap',
  large: 'largeMap',
};
const MAP_BLURB_KEYS: Record<MapId, TranslationKey> = {
  classic: 'classicMapBlurb',
  beginner: 'beginnerMapBlurb',
  large: 'largeMapBlurb',
};

export function translate(language: Language, key: TranslationKey, parameters: Parameters = {}): string {
  return dictionaries[language][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = parameters[name];
    return value === undefined ? placeholder : String(value);
  });
}

export function resourceName(language: Language, resource: Resource): string {
  return translate(language, RESOURCE_KEYS[resource]);
}

export function localizedMapName(language: Language, map: MapId): string {
  return translate(language, MAP_NAME_KEYS[map]);
}

export function localizedMapBlurb(language: Language, map: MapId): string {
  return translate(language, MAP_BLURB_KEYS[map]);
}

const exactLogTranslations: Partial<Record<string, TranslationKey>> = {
  'Longest Road is no longer held.': 'logLongestRoadLost',
  'Longest Road is contested and goes unheld.': 'logLongestRoadContested',
  'Each player rolls to determine who starts.': 'logInitiative',
  'begins the first turn.': 'logBeginsFirstTurn',
  'Everyone holding more than 7 cards must discard half.': 'logEveryoneDiscard',
  'has the highest roll and starts the setup draft.': 'logHighestStarts',
  'places a settlement.': 'logPlacesSettlement',
  'builds a road.': 'logBuildsRoad',
  'moves the robber.': 'logMovesRobber',
  'builds a free road.': 'logBuildsFreeRoad',
  'builds a settlement.': 'logBuildsSettlement',
  'upgrades a settlement to a city.': 'logUpgradesCity',
  'buys a development card.': 'logBuysCard',
  'takes their turn.': 'logTakesTurn',
  'plays a Knight.': 'logPlaysKnight',
  'plays Road Building — place the roads after rolling.': 'logPlaysRoadBuildingSetup',
};

const ENGLISH_RESOURCES: Record<string, Resource> = {
  brick: 'brick',
  lumber: 'lumber',
  wool: 'wool',
  grain: 'grain',
  ore: 'ore',
};

function localizeResourceList(text: string, language: Language): string {
  if (text === 'nothing') return translate(language, 'noResources');
  return text
    .replace(/\b(brick|lumber|wool|grain|ore)\b/g, (name) => {
      const resource = ENGLISH_RESOURCES[name];
      return resource ? resourceName(language, resource).toLowerCase() : name;
    })
    .replace(/\band\b/g, language === 'vi' ? 'và' : 'and');
}

export function translateGameLog(text: string, language: Language): string {
  if (language === 'en') return text;
  const exact = exactLogTranslations[text];
  if (exact) return translate(language, exact);

  let match = text.match(/^takes Longest Road \((\d+) segments\)\.$/);
  if (match) return translate(language, 'logLongestRoadWon', { count: match[1]! });
  match = text.match(/^takes Largest Army \((\d+) knights\)\.$/);
  if (match) return translate(language, 'logLargestArmyWon', { count: match[1]! });
  match = text.match(/^wins the game with (\d+) victory points!$/);
  if (match) return translate(language, 'logWinner', { count: match[1]! });
  match = text.match(/^steals a resource from (.+)\.$/);
  if (match) return translate(language, 'logStealsResource', { name: match[1]! });
  match = text.match(/^The bank runs out of (brick|lumber|wool|grain|ore) — nobody collects it\.$/);
  if (match) return translate(language, 'logBankShortage', { resource: localizeResourceList(match[1]!, language) });
  match = text.match(/^collects (.+) from the second settlement\.$/);
  if (match) return translate(language, 'logCollectsSecondSettlement', { resources: localizeResourceList(match[1]!, language) });
  match = text.match(/^collects (.+)\.$/);
  if (match) return translate(language, 'logCollects', { resources: localizeResourceList(match[1]!, language) });
  match = text.match(/^rolls (\d+) to choose the first player\.$/);
  if (match) return translate(language, 'logRollsToChooseFirst', { score: match[1]! });
  match = text.match(/^The highest roll is tied at (\d+); tied players roll again\.$/);
  if (match) return translate(language, 'logTieReroll', { score: match[1]! });
  match = text.match(/^rolls (\d+)\.$/);
  if (match) return translate(language, 'logRolls', { score: match[1]! });
  match = text.match(/^discards (.+)\.$/);
  if (match) return translate(language, 'logDiscards', { resources: localizeResourceList(match[1]!, language) });
  match = text.match(/^trades (\d+) (brick|lumber|wool|grain|ore) for 1 (brick|lumber|wool|grain|ore)\.$/);
  if (match) {
    return translate(language, 'logBankTrade', {
      count: match[1]!,
      give: localizeResourceList(match[2]!, language),
      want: localizeResourceList(match[3]!, language),
    });
  }
  match = text.match(/^offers (.+) for (.+)\.$/);
  if (match) {
    return translate(language, 'logOffersTrade', {
      give: localizeResourceList(match[1]!, language),
      want: localizeResourceList(match[2]!, language),
    });
  }
  match = text.match(/^counters with (.+) for (.+)\.$/);
  if (match) {
    return translate(language, 'logCountersTrade', {
      give: localizeResourceList(match[1]!, language),
      want: localizeResourceList(match[2]!, language),
    });
  }
  for (const [prefix, key] of [
    ['declines ', 'logDeclinesCounter'],
    ['accepts ', 'logAcceptsCounter'],
  ] as const) {
    const suffix = "'s counteroffer.";
    if (text.startsWith(prefix) && text.endsWith(suffix)) {
      return translate(language, key, { name: text.slice(prefix.length, -suffix.length) });
    }
  }
  match = text.match(/^trades (.+) to (.+) for (.+)\.$/);
  if (match) {
    return translate(language, 'logTradesWithPlayer', {
      give: localizeResourceList(match[1]!, language),
      name: match[2]!,
      want: localizeResourceList(match[3]!, language),
    });
  }
  match = text.match(/^plays Road Building and may build (\d+) free roads\.$/);
  if (match) return translate(language, 'logPlaysRoadBuilding', { count: match[1]! });
  match = text.match(/^plays Year of Plenty and takes (.+)\.$/);
  if (match) return translate(language, 'logPlaysYearOfPlenty', { resources: localizeResourceList(match[1]!, language) });
  match = text.match(/^plays Monopoly and takes (\d+) (brick|lumber|wool|grain|ore)\.$/);
  if (match) {
    return translate(language, 'logPlaysMonopoly', {
      count: match[1]!,
      resource: localizeResourceList(match[2]!, language),
    });
  }
  return text;
}

const serverErrors: Record<string, TranslationKey> = {
  'No game with that code.': 'errorNoGame',
  'That game has already started.': 'errorStarted',
  'The game has already started.': 'errorStarted',
  'That game is full.': 'errorFull',
  'That seat is not in this game.': 'errorSeatMissing',
  'Only the host can start the game.': 'errorHostStart',
  'Only the host can pick the map.': 'errorHostMap',
  'No such map.': 'errorMapMissing',
  'The game has not started.': 'errorNotStarted',
  'You are not in a game.': 'errorNotInGame',
  'Not connected yet.': 'errorNotConnected',
  'That game is no longer available.': 'errorGameUnavailable',
  'This seat is now active in another connection.': 'errorSeatReplaced',
  'Room changes could not be saved and may be lost if the server stops.': 'errorPersistence',
  'Enter the four-letter code from your host.': 'enterFourLetterCode',
};

const ruleErrors: Record<string, string> = {
  'The game is over.': 'Ván chơi đã kết thúc.',
  'You are not in this game.': 'Bạn không ở trong ván chơi này.',
  'It is not your turn.': 'Chưa đến lượt bạn.',
  'You cannot roll for the first player now.': 'Hiện không thể gieo để chọn người đi đầu.',
  'You have already rolled.': 'Bạn đã gieo xúc xắc rồi.',
  'Not placing a settlement.': 'Hiện không thể đặt khu định cư.',
  'No such spot.': 'Vị trí này không tồn tại.',
  'Too close to another settlement.': 'Vị trí quá gần một khu định cư khác.',
  'Not placing a road.': 'Hiện không thể đặt đường.',
  'No such edge.': 'Đoạn đường này không tồn tại.',
  'There is already a road there.': 'Đã có đường ở vị trí đó.',
  'The road must touch the settlement you just placed.': 'Con đường phải nối với khu định cư bạn vừa đặt.',
  'You cannot roll right now.': 'Hiện không thể gieo xúc xắc.',
  'Nobody is discarding.': 'Hiện không có ai phải bỏ bài.',
  'You do not need to discard.': 'Bạn không cần bỏ bài.',
  'You do not hold those cards.': 'Bạn không có những lá bài đó.',
  'The robber is not waiting to move.': 'Hiện không cần di chuyển Kẻ Cướp.',
  'No such hex.': 'Ô lục giác này không tồn tại.',
  'The robber must move to a different hex.': 'Kẻ Cướp phải được chuyển sang một ô lục giác khác.',
  'There is nobody to steal from.': 'Không có ai để cướp bài.',
  'You must steal from an eligible player.': 'Bạn phải chọn một người chơi hợp lệ để cướp bài.',
  'You cannot steal from that player.': 'Bạn không thể cướp bài của người chơi đó.',
  'You cannot build right now.': 'Hiện không thể xây dựng.',
  'You have no road pieces left.': 'Bạn đã hết quân đường.',
  'A road cannot go there.': 'Không thể xây đường ở vị trí đó.',
  'You cannot afford a road.': 'Bạn không đủ tài nguyên để xây đường.',
  'You have no settlement pieces left.': 'Bạn đã hết quân khu định cư.',
  'A settlement cannot go there.': 'Không thể đặt khu định cư ở vị trí đó.',
  'You cannot afford a settlement.': 'Bạn không đủ tài nguyên để xây khu định cư.',
  'You can only upgrade your own settlement.': 'Bạn chỉ có thể nâng cấp khu định cư của mình.',
  'You have no city pieces left.': 'Bạn đã hết quân thành phố.',
  'You cannot afford a city.': 'Bạn không đủ tài nguyên để xây thành phố.',
  'You cannot buy right now.': 'Hiện không thể mua thẻ.',
  'The development card deck is empty.': 'Bộ thẻ phát triển đã hết.',
  'You cannot afford a development card.': 'Bạn không đủ tài nguyên để mua thẻ phát triển.',
  'You cannot trade right now.': 'Hiện không thể giao thương.',
  'Unknown resource.': 'Tài nguyên không hợp lệ.',
  'Trade for a different resource.': 'Hãy đổi lấy một loại tài nguyên khác.',
  'An offer is already on the table.': 'Đã có một lời đề nghị đang mở.',
  'An offer needs cards on both sides.': 'Lời đề nghị cần có bài ở cả hai phía.',
  'You cannot trade the same resource type on both sides.': 'Không thể đưa và yêu cầu cùng một loại tài nguyên.',
  'You do not hold what you are offering.': 'Bạn không có đủ tài nguyên để đưa ra.',
  'Nobody holds what you want.': 'Không ai có tài nguyên bạn muốn.',
  'There is no offer to answer.': 'Không có lời đề nghị nào cần trả lời.',
  'You cannot answer your own offer.': 'Bạn không thể trả lời lời đề nghị của chính mình.',
  'You have already answered this offer.': 'Bạn đã trả lời lời đề nghị này rồi.',
  'You do not hold what they want.': 'Bạn không có đủ tài nguyên họ yêu cầu.',
  'There is no offer to counter.': 'Không có lời đề nghị nào để đưa ra đề nghị ngược.',
  'You cannot counter your own offer.': 'Bạn không thể đưa ra đề nghị ngược cho lời đề nghị của mình.',
  'Another counteroffer is already on the table.': 'Đã có một đề nghị ngược khác đang mở.',
  'A counteroffer needs cards on both sides.': 'Đề nghị ngược cần có bài ở cả hai phía.',
  'They do not hold what you want.': 'Họ không có tài nguyên bạn muốn.',
  'There is no counteroffer to answer.': 'Không có đề nghị ngược nào cần trả lời.',
  'Only the original offerer can answer the counteroffer.': 'Chỉ người đưa ra lời đề nghị ban đầu mới có thể trả lời đề nghị ngược.',
  'Unknown player.': 'Người chơi không hợp lệ.',
  'You no longer hold what they want.': 'Bạn không còn đủ tài nguyên họ yêu cầu.',
  'They no longer hold what they are offering.': 'Họ không còn đủ tài nguyên để đưa ra.',
  'There is no offer on the table.': 'Không có lời đề nghị nào đang mở.',
  'Only the player who made the offer can close it.': 'Chỉ người đưa ra lời đề nghị mới có thể đóng lời đề nghị đó.',
  'That player has not accepted.': 'Người chơi đó chưa đồng ý.',
  'You no longer hold your side.': 'Bạn không còn đủ tài nguyên ở phía mình.',
  'They no longer hold their side.': 'Họ không còn đủ tài nguyên ở phía họ.',
  'There is no offer to withdraw.': 'Không có lời đề nghị nào để rút.',
  'Only the player who made the offer can withdraw it.': 'Chỉ người đưa ra lời đề nghị mới có thể rút lời đề nghị đó.',
  'You cannot end your turn yet.': 'Bạn chưa thể kết thúc lượt.',
  'You cannot play a card right now.': 'Hiện không thể dùng thẻ.',
  'You have already played a development card this turn.': 'Bạn đã dùng một thẻ phát triển trong lượt này rồi.',
  'That card was bought this turn.': 'Thẻ đó vừa được mua trong lượt này.',
  'You do not have that card.': 'Bạn không có thẻ đó.',
  'Choose exactly two resources.': 'Hãy chọn đúng hai tài nguyên.',
  'The bank cannot supply that.': 'Ngân hàng không đủ tài nguyên để cung cấp.',
  'Unknown card.': 'Thẻ không hợp lệ.',
};

export function translateServerMessage(message: string, language: Language): string {
  if (language === 'en') return message;
  const key = serverErrors[message];
  if (key) return translate(language, key);
  const roomLimitMatch = message.match(
    /^You can have at most (\d+) unfinished rooms\. Finish one before creating or joining another\.$/,
  );
  if (roomLimitMatch) return translate(language, 'roomLimitReached', { max: roomLimitMatch[1]! });
  const ruleError = ruleErrors[message];
  if (ruleError) return ruleError;
  const match = message.match(/^You need at least (\d+) players\.$/);
  if (match) return translate(language, 'errorNeedPlayers', { count: match[1]! });
  const discardMatch = message.match(/^You must discard exactly (\d+) cards\.$/);
  if (discardMatch) return `Bạn phải bỏ đúng ${discardMatch[1]} lá bài.`;
  const resourceMatch = message.match(/^You need (\d+) (brick|lumber|wool|grain|ore)\.$/);
  if (resourceMatch) {
    return `Bạn cần ${resourceMatch[1]} ${localizeResourceList(resourceMatch[2]!, language).toLowerCase()}.`;
  }
  const bankMatch = message.match(/^The bank has no (brick|lumber|wool|grain|ore) left\.$/);
  if (bankMatch) return `Ngân hàng đã hết ${localizeResourceList(bankMatch[1]!, language).toLowerCase()}.`;
  return message;
}

type I18nValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: Translator;
};

const defaultI18n: I18nValue = {
  language: 'en',
  setLanguage: () => undefined,
  t: (key, parameters) => translate('en', key, parameters),
};
const I18nContext = createContext(defaultI18n);

function readLanguage(): Language {
  try {
    if (typeof window === 'undefined') return 'en';
    return readLanguagePreference(window.localStorage);
  } catch {
    return 'en';
  }
}

export function readLanguagePreference(storage: Pick<Storage, 'getItem'>): Language {
  try {
    return storage.getItem(LANGUAGE_KEY) === 'vi' ? 'vi' : 'en';
  } catch {
    return 'en';
  }
}

export function saveLanguagePreference(storage: Pick<Storage, 'setItem'>, language: Language): void {
  try {
    storage.setItem(LANGUAGE_KEY, language);
  } catch {
    // The preference remains usable until this page is closed.
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readLanguage);
  const t = (key: TranslationKey, parameters?: Parameters) => translate(language, key, parameters);

  useEffect(() => {
    document.documentElement.lang = language;
    try {
      saveLanguagePreference(window.localStorage, language);
    } catch {
      // The language preference remains usable until this page is closed.
    }
  }, [language]);

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
