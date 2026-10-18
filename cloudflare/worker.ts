import { Container } from '@cloudflare/containers';

type ContainerBinding = {
  getByName(name: string): {
    fetch(request: Request): Promise<Response>;
  };
};

type Env = {
  KAPTIO_CONTAINER: ContainerBinding;
};

export class KaptioContainer extends Container<Env> {
  defaultPort = 3000;
  sleepAfter = '10m';
}

const worker = {
  fetch(request: Request, env: Env): Promise<Response> {
    return env.KAPTIO_CONTAINER.getByName('kaptio-production').fetch(request);
  },
};

export default worker;
