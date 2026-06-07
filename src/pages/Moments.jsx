import { formatDate } from "../systems/time.js";

const moments = [
  {
    id: "moment-1",
    content: "今天翻到一句茨威格：「她的沉默比任何语言都更有力量。」存着了。",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "moment-2",
    content: "昨晚窗外下雨了。想到你说你喜欢雨天。",
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

export default function Moments() {
  return (
    <section className="moments-root">
      <header className="moments-header">
        <div className="du-avatar" style={{ width: 42, height: 42, fontSize: 16 }}>
          机
        </div>
        <div>
          <strong>机的动态</strong>
          <span>先占位，后续再接主动记录</span>
        </div>
      </header>
      <div className="moment-list">
        {moments.map((moment) => (
          <article className="moment-card" key={moment.id}>
            <div className="du-avatar" style={{ width: 34, height: 34, fontSize: 13 }}>
              机
            </div>
            <div>
              <p>{moment.content}</p>
              <time>{formatDate(moment.created_at)}</time>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
