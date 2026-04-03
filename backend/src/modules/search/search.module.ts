import { Module } from '@nestjs/common';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { SearchService } from './search.service';

@Module({
  imports: [ElasticsearchModule],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
